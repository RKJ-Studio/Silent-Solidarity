import React from 'react';
import { Navigation } from '@/components/Navigation';
import { motion } from 'framer-motion';
import { Shield, BookOpen, Users, Lock } from 'lucide-react';

export default function AboutPage() {
  const sections = [
    { icon: BookOpen, title: 'Why this space exists', content: 'Silent Solidarity is an independent digital vigil for people who cannot attend Jantar Mantar. It is a calm place to express support for fair examinations, transparent processes, and institutional accountability. Participation here is symbolic; it is not a substitute for an official civic, legal, or grievance process.' },
    { icon: Users, title: 'Current context', list: [
      'Recent reporting describes an ongoing Jantar Mantar sit-in connected to concerns about alleged irregularities in competitive examinations.',
      'Reported participant demands include fair and transparent examinations, credible investigation of alleged lapses, reform, and public accountability.',
      'We do not organize, direct, fund, or speak for any protest, participant, political party, public authority, or news source. Context can change; check reliable reporting and official notices for current information.',
    ] },
    { icon: Shield, title: 'How to take part', list: [
      'Add one virtual candle from your state, country, or approximate current location.',
      'Use a display name or remain anonymous.',
      'Write an optional respectful message of 10–150 characters.',
      'Accept the Community Rules and Terms. Automated safety filters screen submissions before they are published.',
    ], ordered: true },
    { icon: Lock, title: 'Privacy by design', content: 'Exact coordinates are never displayed. Candle positions are randomized within a region and only state or country labels are public. Do not include phone numbers, addresses, identity numbers, or anyone else’s private information in a message.' },
  ];

  return <div className="min-h-screen bg-background relative pb-20">
    <Navigation />
    <div className="max-w-3xl mx-auto pt-28 sm:pt-32 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-10 text-center">
        <p className="text-primary text-xs uppercase tracking-[0.2em] mb-3">Digital vigil · independent · peaceful</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-white mb-3">For voices beyond Jantar Mantar</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">A peaceful digital vigil inspired by the people calling for fairness and accountability in examinations.</p>
      </motion.div>
      <div className="space-y-4">{sections.map((section, i) => {
        const Icon = section.icon;
        return <motion.section key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-primary" /></div><h2 className="text-lg text-white font-semibold">{section.title}</h2></div>
          {section.content && <p className="text-muted-foreground text-sm leading-relaxed ml-11">{section.content}</p>}
          {section.list && (section.ordered ? <ol className="list-decimal ml-[3.25rem] text-muted-foreground text-sm space-y-2 leading-relaxed">{section.list.map((item, j) => <li key={j}>{item}</li>)}</ol> : <ul className="list-disc ml-[3.25rem] text-muted-foreground text-sm space-y-2 leading-relaxed">{section.list.map((item, j) => <li key={j}>{item}</li>)}</ul>)}
        </motion.section>;
      })}</div>
    </div>
  </div>;
}
