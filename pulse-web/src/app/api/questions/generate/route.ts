/**
 * API Route: Generate a new MCAT question
 * POST /api/questions/generate
 *
 * Body: { subject, topic?, targetDifficulty?, passageBased? }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateQuestion,
  generateSourcedQuestions,
  selectModelTier,
  type GenerateQuestionOptions,
} from '@/lib/ai';
import { checkAndExpandQuestionBank, checkAndExpandWithSourcedContent } from '@/lib/question-bank';
import { prisma } from '@/lib/prisma';
import type { McatSubject } from '@/lib/elo';
import { generateDiscreteQuestions } from '@/lib/discrete-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject,
      topic,
      targetDifficulty,
      passageBased,
      generationType = 'auto',
      count = 1,
      tokensUsedThisMonth = 0,
      monthlyTokenBudget = 500_000,
    } = body as {
      subject: McatSubject;
      topic?: string;
      targetDifficulty?: number;
      passageBased?: boolean;
      generationType?: 'sourced' | 'discrete' | 'auto';
      count?: number;
      tokensUsedThisMonth?: number;
      monthlyTokenBudget?: number;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const modelTier = selectModelTier(tokensUsedThisMonth, monthlyTokenBudget);

    // 1. Asynchronously trigger DB expansion so the global bank grows up to its cap
    if (topic) {
      if (generationType === 'sourced' || (generationType === 'auto' && passageBased !== false)) {
        checkAndExpandWithSourcedContent(subject, topic).catch((e) => console.error('[BankExpand Sourced]', e));
      } else {
        checkAndExpandQuestionBank(subject, topic).catch((e) => console.error('[BankExpand Legacy]', e));
      }
    }

    // 2. Try to fetch an existing question to save tokens
    // ONLY if we are in 'auto' mode and NOT explicitly forcing a specific type.
    // This prevents stale repeats and ensures you get fresh sourced content when asked.
    if (topic && generationType === 'auto') {
      const whereClause: any = { topic };
      if (passageBased === false) whereClause.passage = null;
      else if (passageBased === true) whereClause.passage = { not: null };

      const countDB = await prisma.question.count({ where: whereClause });
      // Only use DB if we have a healthy surplus of questions to choose from randomly
      if (countDB >= Math.max(10, count * 2)) {
        const skip = Math.floor(Math.random() * (countDB - count + 1));
        const randomQs = await prisma.question.findMany({
          where: whereClause,
          skip,
          take: count,
        });
        if (randomQs.length > 0) {
          const formattedQs = randomQs.map((randomQ: any) => ({
            id: randomQ.id,
            subject: randomQ.subject,
            topic: randomQ.topic || '',
            passage: randomQ.passage || null,
            stem: randomQ.text,
            choices: randomQ.choices ? JSON.parse(randomQ.choices as string) : [],
            correctAnswer: randomQ.correctAnswer || 'A',
            explanation: randomQ.explanation,
            distractorExplanations: randomQ.distractorExplanations ? JSON.parse(randomQ.distractorExplanations as string) : undefined,
            difficulty: randomQ.baseDifficulty,
            imageUrls: randomQ.imageUrls ? JSON.parse(randomQ.imageUrls as string) : null,
          }));
          return NextResponse.json({ question: formattedQs[0], questions: formattedQs, modelTier });
        }
      }
    }

    // 3. Fallback: generate a new one inline if DB is empty
    let useSourced = false;
    let useDiscrete = false;

    if (generationType === 'sourced') {
      useSourced = true;
    } else if (generationType === 'discrete') {
      useDiscrete = true;
    } else {
      // auto
      if (passageBased === false) useDiscrete = true;
      else if (passageBased === true) useSourced = true;
      else {
        useSourced = Math.random() > 0.2; // 80% passage-based (sourced)
        useDiscrete = !useSourced; // 20% discrete
      }
    }

    if (useDiscrete) {
      const askCount = count || 1;
      const questions = await generateDiscreteQuestions(apiKey, { subject, topic, targetDifficulty, modelTier, count: askCount });
      
      const savedQuestions = [];
      for (const q of questions) {
        const created = await prisma.question.create({
          data: {
            subject: q.subject,
            topic: topic || q.topic,
            passage: null,
            text: q.stem,
            choices: JSON.stringify(q.choices),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            distractorExplanations: q.distractorExplanations ? JSON.stringify(q.distractorExplanations) : null,
            baseDifficulty: q.difficulty,
            imageUrls: q.imageUrls && q.imageUrls.length > 0 ? JSON.stringify(q.imageUrls) : null,
            generationType: 'discrete',
          }
        });
        savedQuestions.push({ ...q, id: created.id });
      }
      return NextResponse.json({ question: savedQuestions[0], questions: savedQuestions, modelTier });
    }

    if (useSourced && topic) {
      try {
        const sourcedSet = await generateSourcedQuestions(apiKey, {
          subject, topic, targetDifficulty, modelTier, questionCount: Math.max(4, count || 4)
        });

        if (sourcedSet && sourcedSet.questions_array.length > 0) {
          const savedQuestions = [];
          for (const q of sourcedSet.questions_array) {
            const created = await prisma.question.create({
              data: {
                subject: sourcedSet.subject_metadata.subject,
                topic: topic || q.topic,
                passage: sourcedSet.passage_text,
                text: q.stem,
                choices: JSON.stringify(q.choices),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                distractorExplanations: q.distractorExplanations ? JSON.stringify(q.distractorExplanations) : null,
                baseDifficulty: q.difficulty,
                imageUrls: sourcedSet.image_urls.length > 0 ? JSON.stringify(sourcedSet.image_urls) : null,
                sourcePmcId: sourcedSet.source_metadata.pmcId,
                sourceTitle: sourcedSet.source_metadata.title,
                sourceAuthors: sourcedSet.source_metadata.authors,
                sourceLicense: sourcedSet.source_metadata.license,
                requiresFigure: q.requiresFigure,
                referencedFigure: q.referencedFigure,
                generationType: 'sourced'
              }
            });
            savedQuestions.push(created);
          }

          const formattedQs = savedQuestions.map((sq: any) => ({
            id: sq.id,
            subject: sq.subject,
            topic: sq.topic || '',
            passage: sq.passage || null,
            stem: sq.text,
            choices: sq.choices ? JSON.parse(sq.choices as string) : [],
            correctAnswer: sq.correctAnswer || 'A',
            explanation: sq.explanation,
            distractorExplanations: sq.distractorExplanations ? JSON.parse(sq.distractorExplanations as string) : undefined,
            difficulty: sq.baseDifficulty,
            imageUrls: sq.imageUrls ? JSON.parse(sq.imageUrls as string) : null,
            sourcePmcId: sq.sourcePmcId,
          }));
          return NextResponse.json({ question: formattedQs[0], questions: formattedQs, modelTier });
        }
      } catch (err) {
        console.warn('[Generate Route] Sourced generation inline failed, falling back to hallucinated', err);
      }
    }

    // Ultimate fallback: Legacy hallucinated question
    const opts: GenerateQuestionOptions = {
      subject,
      topic,
      targetDifficulty,
      passageBased,
      modelTier,
    };

    const question = await generateQuestion(apiKey, opts);

    // Save fallback to DB
    const createdFallback = await prisma.question.create({
      data: {
        subject: question.subject,
        topic: topic || question.topic,
        passage: question.passage,
        text: question.stem,
        choices: JSON.stringify(question.choices),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        distractorExplanations: question.distractorExplanations ? JSON.stringify(question.distractorExplanations) : null,
        baseDifficulty: question.difficulty,
        generationType: 'hallucinated',
      }
    });

    return NextResponse.json({ question: { ...question, id: createdFallback.id }, questions: [{ ...question, id: createdFallback.id }], modelTier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
