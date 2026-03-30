'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Flag } from 'lucide-react';
import ReactSlider from 'react-slider';
import { getUserPreferences, saveSettings } from '../actions';

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

const verticalTrackRenderers: Record<string, any> = {
  rampUp: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-blue-500' : 'bg-navy-900'}`} />,
  grind: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-purple-500' : 'bg-navy-900'}`} />,
  lastStretch: (props: any, state: any) => <div {...props} className={`${props.className || ''} ${state.index === 0 ? 'bg-red-500' : 'bg-navy-900'}`} />
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [testDate, setTestDate] = useState<string>('');
  const [thumb1, setThumb1] = useState(30);
  const [thumb2, setThumb2] = useState(80);
  const [qsOpts, setQsOpts] = useState({
    rampUp: 20,
    grind: 50,
    lastStretch: 80,
  });

  useEffect(() => {
    getUserPreferences().then((prefs) => {
      if (prefs) {
        if (prefs.testDate) {
          setTestDate(new Date(prefs.testDate).toISOString().split('T')[0]);
        }
        setThumb1(prefs.rampUpPercentage);
        setThumb2(prefs.rampUpPercentage + prefs.grindPercentage);
        setQsOpts({
          rampUp: prefs.rampUpQuestionsPerDay,
          grind: prefs.grindQuestionsPerDay,
          lastStretch: prefs.lastStretchQuestionsPerDay,
        });
      }
    })
    .catch((err) => {
      console.error('Failed to load preferences:', err);
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  const rampUpPct = thumb1;
  const grindPct = thumb2 - thumb1;
  const lastPct = 100 - thumb2;

  const totalDays = testDate ? Math.max(0, (new Date(testDate).getTime() - Date.now()) / 86400000) : 0;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const todayStr = formatDate(new Date());
  const rampUpEndStr = testDate ? formatDate(new Date(Date.now() + (totalDays * rampUpPct / 100) * 86400000)) : '-';
  const grindEndStr = testDate ? formatDate(new Date(Date.now() + (totalDays * thumb2 / 100) * 86400000)) : '-';
  const testDateStr = testDate ? formatDate(new Date(testDate)) : '-';

  const handleSave = async () => {
    if (!testDate) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await saveSettings({
        testDate: new Date(testDate),
        rampUpPercentage: Math.round(rampUpPct),
        grindPercentage: Math.round(grindPct),
        lastStretchPercentage: Math.round(lastPct),
        rampUpQuestionsPerDay: Math.round(qsOpts.rampUp),
        grindQuestionsPerDay: Math.round(qsOpts.grind),
        lastStretchQuestionsPerDay: Math.round(qsOpts.lastStretch),
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8 text-slate-200">
        <header className="mb-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Settings</h1>
          <p className="text-slate-400 font-medium">Manage your prep preferences and schedule.</p>
        </header>

        {loading ? (
          <div className="text-center text-slate-400">Loading your preferences...</div>
        ) : (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <Card className="p-8 bg-navy-800/80 backdrop-blur-sm border-navy-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Test Date</h2>
              <input 
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="bg-navy-900 border border-navy-600 text-white rounded-xl px-5 py-3 text-xl font-bold font-display outline-none focus:border-neon-blue transition-all [color-scheme:dark] block cursor-pointer tracking-wider"
              />
            </Card>

            <Card className="p-8 bg-navy-800/80 backdrop-blur-sm border-navy-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Phase Timeline Strategy</h2>
              <p className="text-slate-400 text-sm mb-4">Adjust the duration of each prep phase leading up to your test date.</p>
              
              <div className="relative w-full mb-6 mt-4">
                <ReactSlider
                  className="w-full h-8 relative touch-none cursor-pointer mt-6"
                  thumbClassName="w-6 h-6 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_10px_rgba(0,0,0,0.5)] border-[3px] outline-none top-[4px] z-10"
                  trackClassName="h-3 rounded-full top-[10px]"
                  value={[thumb1, thumb2]}
                  min={1} max={99} step={1} minDistance={1}
                  onChange={(val) => { setThumb1(val[0]); setThumb2(val[1]); }}
                  renderTrack={renderHorizontalTrack}
                  renderThumb={renderHorizontalThumb}
                />
                
                {testDate && (
                  <div className="absolute top-[-18px] right-0 flex flex-col items-end pointer-events-none">
                    <Flag className="w-5 h-5 text-neon-blue drop-shadow-[0_0_8px_rgba(0,216,232,0.8)]" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-xs font-bold text-slate-500 tracking-wider mb-8">
                <span className="text-blue-400 w-1/3 text-left">
                  {todayStr} - {rampUpEndStr}<br/>
                  <span className="text-[10px] text-slate-600 font-medium">({Math.round(rampUpPct)}%)</span>
                </span>
                <span className="text-purple-400 w-1/3 text-center">
                  {rampUpEndStr} - {grindEndStr}<br/>
                  <span className="text-[10px] text-slate-600 font-medium">({Math.round(grindPct)}%)</span>
                </span>
                <span className="text-red-400 w-1/3 text-right">
                  {grindEndStr} - <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{testDateStr}</span><br/>
                  <span className="text-[10px] text-slate-600 font-medium">({Math.round(lastPct)}%)</span>
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-6 mt-12">Questions Per Day Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { phase: 'Ramp Up', key: 'rampUp', fillColor: 'bg-blue-500', borderColor: 'border-blue-500', max: 120, textClass: 'text-blue-400' },
                  { phase: 'The Grind', key: 'grind', fillColor: 'bg-purple-500', borderColor: 'border-purple-500', max: 120, textClass: 'text-purple-400' },
                  { phase: 'Last Stretch', key: 'lastStretch', fillColor: 'bg-red-500', borderColor: 'border-red-500', max: 120, textClass: 'text-red-400' },
                ].map((col) => (
                  <div key={col.key} className="flex flex-col items-center gap-4 bg-navy-900/50 p-6 rounded-xl border border-navy-700">
                    <div className={`text-sm font-bold uppercase tracking-widest ${col.textClass}`}>{col.phase}</div>
                    <div className="text-3xl font-display font-bold text-white my-4">{Math.round(qsOpts[col.key as keyof typeof qsOpts])} <span className="text-sm text-slate-500 font-normal">Qs/day</span></div>
                    <ReactSlider
                      className="w-full h-8 relative cursor-pointer touch-none"
                      thumbClassName={`w-7 h-7 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_8px_rgba(0,0,0,0.5)] border-[4px] outline-none top-[2px] z-10 ${col.borderColor}`}
                      trackClassName="h-3 rounded-full top-[10px]"
                      value={qsOpts[col.key as keyof typeof qsOpts]}
                      min={0} max={col.max} step={1}
                      onChange={(v) => setQsOpts(p => ({...p, [col.key]: v}))}
                      renderTrack={verticalTrackRenderers[col.key]}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex items-center justify-end gap-4">
              {saveStatus === 'success' && (
                <span className="text-emerald-400 text-sm font-bold animate-fade-in flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Settings saved successfully!
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 text-sm font-bold animate-fade-in flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Failed to save — please try again.
                </span>
              )}
              <Button variant="primary" neon className="w-48 font-bold text-lg" onClick={handleSave} disabled={saving || !testDate}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
