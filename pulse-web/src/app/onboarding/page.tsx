'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Flag } from 'lucide-react';
import ReactSlider from 'react-slider';
import { submitOnboarding } from '../actions';

const PHASES = [
  { id: 'rampUp', name: 'Ramp Up', color: 'bg-blue-500' },
  { id: 'grind', name: 'The Grind', color: 'bg-purple-500' },
  { id: 'lastStretch', name: 'Last Stretch', color: 'bg-red-500' },
];

const renderHorizontalTrack = (props: any, state: any) => {
  const bgClass =
    state.index === 0 ? 'bg-blue-500' :
    state.index === 1 ? 'bg-purple-500' : 'bg-red-500';
  return <div {...props} className={`${props.className || ''} ${bgClass}`} />;
};

const renderHorizontalThumb = (props: any, state: any) => {
  const borderColor =
    state.index === 0 ? 'border-blue-500' : 'border-purple-500';
  return <div {...props} className={`${props.className || ''} ${borderColor}`} />;
};

const VerticalTrackRenderers: Record<string, any> = {
  rampUp: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-blue-500' : 'bg-navy-900'}`} />,
  grind: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-purple-500' : 'bg-navy-900'}`} />,
  lastStretch: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-red-500' : 'bg-navy-900'}`} />
};

const VerticalSlider = ({ phase, keyId, val, setVal, borderColor, max = 120 }: any) => (
  <div className="flex flex-col flex-1 items-center gap-4 bg-navy-800/50 p-4 rounded-xl border border-navy-700">
    <div className={`text-xs font-bold uppercase tracking-widest text-slate-400`}>{phase}</div>
    <div className="h-48 flex justify-center py-4 relative">
      <ReactSlider
        className="w-8 h-full relative cursor-pointer touch-none mx-auto"
        orientation="vertical"
        invert={true}
        thumbClassName={`w-8 h-8 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_10px_rgba(0,0,0,0.5)] border-[4px] outline-none left-0 z-10 ${borderColor}`}
        trackClassName="w-3 rounded-full left-[10px]"
        value={val}
        min={0} max={max} step={1}
        onChange={(v) => setVal(v)}
        renderTrack={VerticalTrackRenderers[keyId]}
      />
    </div>
    <div className="text-2xl font-display font-bold text-white">{Math.round(val)} <span className="text-sm text-slate-500">Qs/day</span></div>
  </div>
);

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // States
  const [testDate, setTestDate] = useState<string>('');
  const [thumb1, setThumb1] = useState(30); // split between ramp Up & Grind
  const [thumb2, setThumb2] = useState(80); // split between Grind & Last Stretch

  const [qsOpts, setQsOpts] = useState({
    rampUp: 20,
    grind: 50,
    lastStretch: 80,
  });

  const [loading, setLoading] = useState(false);

  // Derived phase percentages
  const rampUpPct = thumb1;
  const grindPct = thumb2 - thumb1;
  const lastPct = 100 - thumb2;

  const totalDays = testDate ? Math.max(0, (new Date(testDate).getTime() - Date.now()) / 86400000) : 0;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const todayStr = formatDate(new Date());
  const rampUpEndStr = testDate ? formatDate(new Date(Date.now() + (totalDays * rampUpPct / 100) * 86400000)) : '-';
  const grindEndStr = testDate ? formatDate(new Date(Date.now() + (totalDays * thumb2 / 100) * 86400000)) : '-';
  const testDateStr = testDate ? formatDate(new Date(testDate)) : '-';

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSave = async () => {
    if (!testDate) return;
    setLoading(true);
    try {
      await submitOnboarding({
        testDate: new Date(testDate),
        rampUpPercentage: Math.round(rampUpPct),
        grindPercentage: Math.round(grindPct),
        lastStretchPercentage: Math.round(lastPct),
        rampUpQuestionsPerDay: Math.round(qsOpts.rampUp),
        grindQuestionsPerDay: Math.round(qsOpts.grind),
        lastStretchQuestionsPerDay: Math.round(qsOpts.lastStretch),
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-navy-900 text-slate-200 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      
      {/* STEPS */}
      <Card className="w-full max-w-4xl min-h-[500px] flex flex-col bg-navy-800/80 backdrop-blur-xl border border-navy-700 p-8 shadow-2xl relative overflow-hidden">
        
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in gap-6">
            <h1 className="text-5xl font-display font-bold text-white">Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple shadow-neon-blue drop-shadow-lg">Spike</span></h1>
            <p className="text-xl text-slate-400 max-w-lg">Before we build your personalized AI study plan, let's take a quick look around and set up your schedule.</p>
            <div className="w-full max-w-md bg-navy-900 rounded-xl p-4 border border-navy-700 my-4 text-left shadow-inner">
              <h3 className="text-neon-blue font-bold tracking-wide uppercase text-sm mb-2">Sample Walkthrough</h3>
              <ul className="text-sm text-slate-400 space-y-3 font-medium">
                <li className="flex gap-3"><span className="text-blue-500">1.</span> We serve you a customized daily block of questions tailored exactly to your weak points.</li>
                <li className="flex gap-3"><span className="text-purple-500">2.</span> Our AI tutor guides you through any mistakes instantly.</li>
                <li className="flex gap-3"><span className="text-emerald-500">3.</span> Your ELO adjusts, unlocking harder difficulties and new tiers.</li>
              </ul>
            </div>
            <Button variant="primary" neon className="w-48 py-3 text-lg font-bold tracking-wider" onClick={handleNext}>Let's Go</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in gap-8">
            <h2 className="text-4xl font-display font-bold text-white">When is your Test Date?</h2>
            <p className="text-slate-400 font-medium text-lg">We'll use this date to retroactively schedule your prep phase intensities.</p>
            
            <input 
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="bg-navy-900 border-2 border-neon-blue text-white rounded-xl px-8 py-5 text-2xl font-bold font-display shadow-[0_0_15px_rgba(0,216,232,0.3)] outline-none focus:border-neon-cyan focus:shadow-[0_0_20px_rgba(0,216,232,0.6)] transition-all [color-scheme:dark] block cursor-pointer tracking-wider"
            />

            <div className="flex gap-4 mt-8 w-full max-w-sm">
              <Button variant="secondary" className="flex-1" onClick={handleBack}>Back</Button>
              <Button variant="primary" neon className="flex-1 font-bold tracking-wider" disabled={!testDate} onClick={handleNext}>Next Step</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col animate-fade-in gap-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-display font-bold text-white tracking-wide">Customize Your Schedule</h2>
              <p className="text-slate-400 font-medium">Adjust the lengths and intensity for each phase leading up to test day.</p>
            </div>

            <div className="flex flex-col mt-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2">Phase Duration Strategy ({Math.round(rampUpPct)}% - {Math.round(grindPct)}% - {Math.round(lastPct)}%)</h3>

              <div className="relative w-full mb-6 mt-4">
                <ReactSlider
                  className="w-full h-8 relative touch-none cursor-pointer mt-4"
                  thumbClassName="w-6 h-6 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_10px_rgba(0,0,0,0.5)] border-[3px] outline-none top-[4px] z-10"
                  trackClassName="h-3 rounded-full top-[10px]"
                  value={[thumb1, thumb2]}
                  min={1} max={99} step={1} minDistance={1}
                  onChange={(val) => { setThumb1(val[0]); setThumb2(val[1]); }}
                  renderTrack={renderHorizontalTrack}
                  renderThumb={renderHorizontalThumb}
                />
                {testDate && (
                  <div className="absolute top-[-24px] right-0 flex flex-col items-end pointer-events-none">
                    <Flag className="w-5 h-5 text-neon-blue drop-shadow-[0_0_8px_rgba(0,216,232,0.8)]" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-xs font-bold text-slate-500 tracking-wider">
                <span className="text-blue-400 text-left">
                  {todayStr} - {rampUpEndStr}<br/>
                  <span className="text-[10px] text-slate-600">({Math.round(rampUpPct)}%)</span>
                </span>
                <span className="text-purple-400 text-center">
                  {rampUpEndStr} - {grindEndStr}<br/>
                  <span className="text-[10px] text-slate-600">({Math.round(grindPct)}%)</span>
                </span>
                <span className="text-red-400 text-right">
                  {grindEndStr} - <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{testDateStr}</span><br/>
                  <span className="text-[10px] text-slate-600">({Math.round(lastPct)}%)</span>
                </span>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Questions Per Day Goals</h3>
              <div className="flex gap-6 w-full h-full justify-between items-stretch">
                <VerticalSlider keyId="rampUp" phase="Ramp Up" val={qsOpts.rampUp} setVal={(v:any) => setQsOpts(p => ({...p, rampUp: v}))} borderColor="border-blue-500" />
                <VerticalSlider keyId="grind" phase="The Grind" val={qsOpts.grind} setVal={(v:any) => setQsOpts(p => ({...p, grind: v}))} borderColor="border-purple-500" />
                <VerticalSlider keyId="lastStretch" phase="Last Stretch" val={qsOpts.lastStretch} setVal={(v:any) => setQsOpts(p => ({...p, lastStretch: v}))} borderColor="border-red-500" />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" className="w-1/3" onClick={handleBack}>Back</Button>
              <Button variant="primary" neon className="w-2/3 font-bold tracking-wider" onClick={handleNext}>View Timeline Summary</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col animate-fade-in gap-6">
            <h2 className="text-3xl font-display font-bold text-white text-center">Your Battle Plan</h2>
            <p className="text-center text-slate-400">Review your generated prep timeline based on your selected dates and phases.</p>

              <div className="flex-1 bg-navy-900 rounded-xl border border-navy-700 p-6 flex flex-col gap-6 shadow-inner overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/50">
                    <span className="text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Ramp Up Stage</h4>
                    <p className="text-slate-400 text-sm">~{Math.round(rampUpPct)}% of your timeline • Goal: <span className="text-blue-400 font-bold">{Math.round(qsOpts.rampUp)}</span> questions/day</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/50">
                    <span className="text-purple-400 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">The Grind Stage</h4>
                    <p className="text-slate-400 text-sm">~{Math.round(grindPct)}% of your timeline • Goal: <span className="text-purple-400 font-bold">{Math.round(qsOpts.grind)}</span> questions/day</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/50">
                    <span className="text-red-400 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Last Stretch Stage</h4>
                    <p className="text-slate-400 text-sm">~{Math.round(lastPct)}% of your timeline • Goal: <span className="text-red-400 font-bold">{Math.round(qsOpts.lastStretch)}</span> questions/day</p>
                  </div>
                </div>

              <div className="mt-auto border-t border-navy-700 pt-4 flex justify-between items-end">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Test Date Goal</div>
                  <div className="text-2xl font-bold text-white">{new Date(testDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div className="text-sm text-slate-400">Settings can be modified later in Preferences.</div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button variant="secondary" className="w-1/3" onClick={handleBack} disabled={loading}>Back</Button>
              <Button variant="primary" neon className="w-2/3 font-bold tracking-wider" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Finalize & Launch'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
