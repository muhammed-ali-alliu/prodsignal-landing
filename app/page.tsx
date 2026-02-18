"use client";

import { useState, useRef, useEffect } from "react";
import {
  FolderOpen,
  FileText,
  ClipboardList,
  AlertTriangle,
  Lightbulb,
  Target,
  Upload,
  X,
  ArrowRight,
  Download,
  Mail,
  Waves,
  Sparkles,
} from "lucide-react";

interface AnalysisResult {
  success: boolean;
  analysis: string;
  interviewCount: number;
  error?: string;
}

interface Problem {
  title: string;
  mentionedIn: string;
  impact: string;
  evidence: string[];
}

interface Feature {
  feature: string;
  why: string;
  effort: string;
  priority: string;
}

interface TopPriority {
  what: string;
  why: string;
  impact: string;
  evidence: string;
}

type AppState = 'landing' | 'analyzing' | 'results';

const SAMPLE_INTERVIEWS = [
  `Interview with Sarah - Product Manager at TechCorp

Interviewer: Thanks for joining. Can you tell me about your current workflow?

Sarah: Sure. I spend about 4 hours a week just copy-pasting data between our CRM and our analytics tool. It's really tedious. There's no integration, so I have to manually export CSVs, clean them up, and then import them.

Interviewer: That sounds painful. What would help?

Sarah: An automatic sync would be huge. Or even just a better export format from the CRM. Right now the exports are messy and require a lot of cleanup.

Interviewer: Any other frustrations?

Sarah: The reporting is limited. I can't create custom dashboards for my team. We all need different views but there's only one standard report.`,

  `Interview with Mike - Engineering Lead at StartupXYZ

Interviewer: What's your biggest pain point right now?

Mike: Documentation. Our knowledge base is outdated and nobody updates it. When new engineers join, they ask the same questions over and over.

Interviewer: How do you handle that?

Mike: We end up having senior devs repeat themselves in Slack. It's not scalable. We need something that makes documentation easy to keep updated, maybe integrated with our workflow.

Interviewer: What would your ideal solution look like?

Mike: Something that automatically documents code changes. Or at least reminds devs to update docs when they modify something. Right now it's purely manual and easy to forget.`,

  `Interview with Lisa - Customer Success Manager

Interviewer: What feedback do you hear from customers?

Lisa: They love the product, but onboarding is confusing. They don't know where to start. There's no guided tour or checklist.

Interviewer: What happens then?

Lisa: They churn early or they bombard support with basic questions. Our team spends 60% of time answering questions that should be in the product.

Interviewer: What would help?

Lisa: An interactive onboarding flow. In-product tooltips. A getting started checklist. Something that guides new users without them having to contact support.`
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [parsedResults, setParsedResults] = useState<{
    problems: Problem[];
    features: Feature[];
    topPriority: TopPriority | null;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'text/plain' || f.name.endsWith('.md') || f.name.endsWith('.txt')
    );
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  };

  const handlePasteText = () => {
    const text = prompt('Paste your interview transcript:');
    if (text?.trim()) {
      setPastedText([...pastedText, text]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const removePastedText = (index: number) => {
    setPastedText(pastedText.filter((_, i) => i !== index));
  };

  const useSampleData = () => {
    setPastedText(SAMPLE_INTERVIEWS);
  };

  const analyzeInterviews = async () => {
    setAppState('analyzing');

    try {
      const fileContents = await Promise.all(
        uploadedFiles.map(file => file.text())
      );

      const allInterviews = [...fileContents, ...pastedText];

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviews: allInterviews })
      });

      const result: AnalysisResult = await response.json();

      if (result.success) {
        setAnalysis(result.analysis);
        parseAnalysisResults(result.analysis);
        setAppState('results');
      } else {
        alert(result.error || 'Analysis failed. Please try again.');
        setAppState('landing');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze interviews. Please check your connection and try again.');
      setAppState('landing');
    }
  };

  const parseAnalysisResults = (text: string) => {
    const problems: Problem[] = [];
    const features: Feature[] = [];
    let topPriority: TopPriority | null = null;

    const lines = text.split('\n');
    let currentSection: string | null = null;
    let currentProblem: Partial<Problem> | null = null;
    let currentFeature: Partial<Feature> | null = null;
    let currentEvidence: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('PROBLEMS IDENTIFIED')) {
        currentSection = 'problems';
        continue;
      }
      if (line.includes('RECOMMENDED FEATURES')) {
        if (currentProblem && currentProblem.title) {
          currentProblem.evidence = currentEvidence;
          problems.push(currentProblem as Problem);
        }
        currentProblem = null;
        currentEvidence = [];
        currentSection = 'features';
        continue;
      }
      if (line.includes('TOP PRIORITY')) {
        if (currentFeature && currentFeature.feature) {
          features.push(currentFeature as Feature);
        }
        currentFeature = null;
        currentSection = 'topPriority';
        continue;
      }

      if (currentSection === 'problems' && line.startsWith('Problem:')) {
        if (currentProblem && currentProblem.title) {
          currentProblem.evidence = currentEvidence;
          problems.push(currentProblem as Problem);
        }
        currentProblem = { title: line.replace('Problem:', '').trim() };
        currentEvidence = [];
      } else if (currentSection === 'problems' && line.startsWith('Mentioned in:')) {
        if (currentProblem) currentProblem.mentionedIn = line.replace('Mentioned in:', '').trim();
      } else if (currentSection === 'problems' && line.startsWith('Impact:')) {
        if (currentProblem) currentProblem.impact = line.replace('Impact:', '').trim();
      } else if (currentSection === 'problems' && line.startsWith('Evidence:')) {
        const evidenceText = line.replace('Evidence:', '').trim();
        if (evidenceText) currentEvidence.push(evidenceText);
      } else if (currentSection === 'problems' && line.startsWith('-')) {
        currentEvidence.push(line.replace(/^-\s*/, ''));
      } else if (currentSection === 'problems' && line.startsWith('"')) {
        currentEvidence.push(line);
      }

      if (currentSection === 'features' && line.startsWith('Feature:')) {
        if (currentFeature && currentFeature.feature) {
          features.push(currentFeature as Feature);
        }
        currentFeature = { feature: line.replace('Feature:', '').trim() };
      } else if (currentSection === 'features' && line.startsWith('Why:')) {
        if (currentFeature) currentFeature.why = line.replace('Why:', '').trim();
      } else if (currentSection === 'features' && line.startsWith('Effort:')) {
        if (currentFeature) currentFeature.effort = line.replace('Effort:', '').trim();
      } else if (currentSection === 'features' && line.startsWith('Priority:')) {
        if (currentFeature) currentFeature.priority = line.replace('Priority:', '').trim();
      }

      if (currentSection === 'topPriority') {
        if (line.startsWith('What to build first:')) {
          topPriority = { what: line.replace('What to build first:', '').trim(), why: '', impact: '', evidence: '' };
        } else if (topPriority && line.startsWith('Why:')) {
          topPriority.why = line.replace('Why:', '').trim();
        } else if (topPriority && line.startsWith('Expected impact:')) {
          topPriority.impact = line.replace('Expected impact:', '').trim();
        } else if (topPriority && line.startsWith('Customer evidence:')) {
          topPriority.evidence = line.replace('Customer evidence:', '').trim();
        }
      }
    }

    if (currentProblem && currentProblem.title) {
      currentProblem.evidence = currentEvidence;
      problems.push(currentProblem as Problem);
    }
    if (currentFeature && currentFeature.feature) {
      features.push(currentFeature as Feature);
    }

    setParsedResults({ problems, features, topPriority });
  };

  const exportToMarkdown = () => {
    const markdown = `# ProdSignal Analysis Report
Generated on ${new Date().toLocaleDateString()}

---

${parsedResults?.topPriority ? `## TOP PRIORITY

**What to build:** ${parsedResults.topPriority.what}

**Why:** ${parsedResults.topPriority.why}

**Expected Impact:** ${parsedResults.topPriority.impact}

**Customer Evidence:** ${parsedResults.topPriority.evidence}

---

` : ''}## PROBLEMS IDENTIFIED

${parsedResults?.problems.map((p, i) => `### ${i + 1}. ${p.title}

**Mentioned in:** ${p.mentionedIn}
**Impact:** ${p.impact}

**Evidence:**
${p.evidence.map(e => `- ${e}`).join('\n')}

`).join('\n')}

---

## RECOMMENDED FEATURES

${parsedResults?.features.map((f, i) => `### ${i + 1}. ${f.feature}

**Why:** ${f.why}
**Effort:** ${f.effort}
**Priority:** ${f.priority}

`).join('\n')}

---

*Generated by ProdSignal - AI Product Discovery Tool*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodsignal-analysis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitEmail = () => {
    if (email.trim()) {
      alert(`Welcome to the waitlist! We'll notify ${email} when we launch with your 50% founding customer discount.`);
      setEmail('');
    }
  };

  const totalInterviews = uploadedFiles.length + pastedText.length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />

      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            ProdSignal
          </span>
          {appState === 'results' && (
            <button
              onClick={() => { setAppState('landing'); setAnalysis(''); setParsedResults(null); setUploadedFiles([]); setPastedText([]); }}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              ← New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Landing State */}
      {appState === 'landing' && (
        <>
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center">
            {/* Decorative elements */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className={`${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} transition-all duration-1000 ease-out`}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
                    <Waves className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-white/70">AI-Powered Product Discovery</span>
                  </div>

                  <h1 className="text-5xl md:text-6xl font-bold leading-[0.95] tracking-tight mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    From Customer Calls to<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">
                      Prioritized Specs
                    </span>
                  </h1>
                  <p className="text-2xl md:text-3xl font-bold text-white/80 mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    In hours, not weeks
                  </p>

                  <p className="text-xl text-white/60 leading-relaxed mb-10 max-w-lg" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                    Upload customer interviews. Get AI-powered PRDs with full traceability from quotes to features.
                  </p>

                  <button
                    onClick={scrollToDemo}
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-amber-400 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-400/25"
                    style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  >
                    Try Demo
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="mt-12 flex items-center gap-8 text-sm text-white/40">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>No signup required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Free analysis</span>
                    </div>
                  </div>
                </div>

                {/* Hero visual */}
                <div className={`${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'} transition-all duration-1000 delay-300 ease-out relative`}>
                  <div className="relative">
                    {/* Stylized card stack */}
                    <div className="absolute -top-4 -left-4 w-full h-full bg-gradient-to-br from-amber-500/20 to-emerald-500/20 rounded-3xl transform rotate-3" />
                    <div className="absolute -top-2 -left-2 w-full h-full bg-gradient-to-br from-amber-500/10 to-emerald-500/10 rounded-3xl transform rotate-1" />
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm">1</div>
                          <p className="text-white/60">"100+ interviews sitting unanalyzed"</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">2</div>
                          <p className="text-white/60">"No clear patterns or priorities"</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">3</div>
                          <p className="text-white/60">"Decisions based on gut feel, not data"</p>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Sparkles className="w-5 h-5" />
                          <span className="text-sm font-medium">ProdSignal finds the patterns</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Research/Problem Section */}
          <section className="py-20 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm font-medium mb-6">
                    <span>The Problem</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    PMs spend DAYS on synthesis
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm font-bold">£</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Average PM stack: £400-2,000/month</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Multiple tools that don't talk to each other</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm">⏱</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Hours spent manually tagging interviews</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Spreadsheets, sticky notes, endless docs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm">?</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>No connection between discovery → decisions</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Feature requests lost in translation</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium mb-6">
                    <span>The Solution</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    ProdSignal automates the synthesis
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm font-bold">10</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>10 calls → Prioritized PRD in one day</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>AI extracts problems, features, and evidence automatically</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm">🔗</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Full traceability</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Every requirement links to customer quotes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm">⚡</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Replace hours of manual work</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>Focus on decisions, not data entry</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-32 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { num: '01', title: 'Upload', desc: 'Drop your interview transcripts', color: 'from-amber-400 to-amber-500' },
                  { num: '02', title: 'Analyze', desc: 'AI extracts patterns and insights', color: 'from-emerald-400 to-emerald-500' },
                  { num: '03', title: 'Prioritize', desc: 'Get evidence-backed recommendations', color: 'from-blue-400 to-blue-500' },
                ].map((step, i) => (
                  <div key={i} className="group">
                    <div className={`text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br ${step.color} opacity-20 group-hover:opacity-40 transition-opacity mb-4`} style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {step.num}
                    </div>
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{step.title}</h3>
                    <p className="text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Platform Vision */}
          <section className="py-32 border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Complete Product Discovery Platform
                </h2>
                <p className="text-xl text-white/60 max-w-2xl mx-auto" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                  ProdSignal isn't just transcript analysis. It's a complete platform that automates your entire product discovery process.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {/* Available Today */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-black font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-emerald-400" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                        Available Today
                      </h3>
                    </div>
                  </div>
                  <h4 className="text-2xl font-bold mb-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    Interview Analysis
                  </h4>
                  <p className="text-white/60 mb-4" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                    Upload transcripts, get prioritized features with evidence
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Try demo above
                  </div>
                </div>

                {/* Coming Soon */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-400 font-bold text-sm">→</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-amber-400" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                        Coming in Q1 2026
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'Usage Data Integration', desc: 'Connect Mixpanel/Amplitude. Combine behavioral data with customer interviews' },
                      { title: 'Decision Engine', desc: 'Ask what should we build next. Get AI recommendations ranked by impact' },
                      { title: 'Spec Generator', desc: 'Turn feature ideas into complete PRDs. Output ready for Cursor/engineers' },
                      { title: 'Continuous Monitoring', desc: 'Auto-analyze support tickets, NPS, reviews. Never miss important signals' },
                    ].map((feature, i) => (
                      <div key={i} className="border-l-2 border-amber-500/30 pl-4">
                        <h4 className="font-semibold mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{feature.title}</h4>
                        <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full text-sm font-medium mb-6">
                    <span>Early Access</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    Pricing
                  </h2>
                  <p className="text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                    Join waitlist for 50% founding customer discount
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Starter */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-colors">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Starter</h3>
                    <div className="text-4xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>£39<span className="text-lg text-white/50">/mo</span></div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        1 PM
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        Unlimited interview analysis
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        PRD generation
                      </li>
                      <li className="text-sm text-white/40">Perfect for solo PMs</li>
                    </ul>
                    <button
                      onClick={scrollToDemo}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      Get Started
                    </button>
                  </div>

                  {/* Team - Featured */}
                  <div className="bg-gradient-to-br from-amber-400/10 to-emerald-400/10 border border-amber-400/30 rounded-3xl p-8 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-emerald-400 text-black text-xs font-bold rounded-full">
                      POPULAR
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Team</h3>
                    <div className="text-4xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>£199<span className="text-lg text-white/50">/mo</span></div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">✓</div>
                        Up to 5 PMs
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">✓</div>
                        All features
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">✓</div>
                        Integrations
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">✓</div>
                        Team collaboration
                      </li>
                    </ul>
                    <button
                      onClick={scrollToDemo}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-emerald-400 text-black rounded-full font-bold hover:shadow-lg hover:shadow-amber-400/25 transition-all"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      Get Started
                    </button>
                  </div>

                  {/* Enterprise */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-colors">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Enterprise</h3>
                    <div className="text-4xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Custom</div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        Unlimited PMs
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        SSO & security
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</div>
                        Dedicated support
                      </li>
                    </ul>
                    <button
                      onClick={scrollToDemo}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
                      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                      Contact Sales
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Demo Section */}
          <section id="demo-section" className="py-32 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Try ProdSignal
                </h2>
                <p className="text-xl text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                  Upload your interviews or use our sample data
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-amber-400 bg-amber-400/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
                }`}
              >
                <div className="mb-6 flex justify-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDragging ? 'bg-amber-400 text-black scale-110' : 'bg-white/5 text-white/40'
                  }`}>
                    <FolderOpen className="w-10 h-10" />
                  </div>
                </div>
                <p className="text-lg mb-3 text-white/70" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                  Drag and drop interview transcripts
                </p>
                <p className="text-white/40 mb-8">or</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
                    style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  >
                    <Upload className="w-4 h-4" />
                    Select Files
                  </label>
                  <button
                    onClick={handlePasteText}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-full font-semibold hover:bg-white/10 transition-colors"
                    style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  >
                    Paste Text
                  </button>
                </div>

                {pastedText.length === 0 && uploadedFiles.length === 0 && (
                  <button
                    onClick={useSampleData}
                    className="mt-10 text-amber-400 hover:text-amber-300 transition-colors text-sm inline-flex items-center gap-2"
                  >
                    <span>Or use sample data</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Files List */}
              {(uploadedFiles.length > 0 || pastedText.length > 0) && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                      {totalInterviews} interview{totalInterviews !== 1 ? 's' : ''} ready
                    </p>
                    <button
                      onClick={() => { setUploadedFiles([]); setPastedText([]); }}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-3 mb-8">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={`file-${i}`}
                        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-white/20 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <span className="text-sm flex-1 truncate" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{file.name}</span>
                        <span className="text-xs text-white/30 flex-shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          onClick={() => removeFile(i)}
                          className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {pastedText.map((text, i) => (
                      <div
                        key={`paste-${i}`}
                        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-white/20 transition-colors"
                      >
                        <ClipboardList className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm flex-1 truncate" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                          Interview {i + 1}
                        </span>
                        <span className="text-xs text-white/30 flex-shrink-0">
                          {(text.length / 1024).toFixed(1)} KB
                        </span>
                        <button
                          onClick={() => removePastedText(i)}
                          className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={analyzeInterviews}
                    className="w-full py-5 bg-gradient-to-r from-amber-400 to-emerald-400 text-black rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-amber-400/25 transition-all duration-300 hover:scale-[1.02]"
                    style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  >
                    Analyze {totalInterviews} interview{totalInterviews !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Email Capture */}
          <section className="py-32 border-t border-white/5">
            <div className="max-w-md mx-auto px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Get 50% off launch pricing
              </h2>
              <p className="text-white/50 mb-8" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                Join the waitlist for founding customer discount. Limited spots available.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <iframe
                  data-tally-src="https://tally.so/r/XxDedj"
                  width="100%"
                  height="400"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  title="ProdSignal Waitlist"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Analyzing State */}
      {appState === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-amber-400 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Analyzing interviews</h2>
          <p className="text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
            Processing {totalInterviews} interview{totalInterviews !== 1 ? 's' : ''}...
          </p>
          <p className="text-sm text-white/30 mt-4">This may take up to 30 seconds</p>
        </div>
      )}

      {/* Results State */}
      {appState === 'results' && parsedResults && (
        <div className="max-w-4xl mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 text-emerald-400 text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Analysis Complete
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Your insights are ready
            </h1>
            <p className="text-xl text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
              Based on {totalInterviews} interview{totalInterviews !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Top Priority */}
          {parsedResults.topPriority && (
            <div className="mb-12 bg-gradient-to-br from-amber-400/10 to-emerald-400/10 border border-amber-400/20 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 flex items-center justify-center">
                  <Target className="w-6 h-6 text-black" />
                </div>
                <div>
                  <span className="text-sm text-white/50 uppercase tracking-wider">Top Priority</span>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {parsedResults.topPriority.what}
                  </h2>
                </div>
              </div>
              <p className="text-lg text-white/70 mb-6" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                {parsedResults.topPriority.why}
              </p>
              <div className="flex items-center gap-4 mb-6">
                <span className="px-4 py-2 bg-emerald-400/10 text-emerald-400 rounded-full text-sm font-medium">
                  Impact: {parsedResults.topPriority.impact}
                </span>
              </div>
              {parsedResults.topPriority.evidence && (
                <blockquote className="pl-6 border-l-2 border-amber-400 text-white/50 italic" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                  "{parsedResults.topPriority.evidence}"
                </blockquote>
              )}
            </div>
          )}

          {/* Problems Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              Problems Identified
            </h2>
            <div className="space-y-4">
              {parsedResults.problems.map((problem, i) => (
                <details
                  key={i}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors"
                >
                  <summary className="p-6 cursor-pointer hover:bg-white/5 transition-colors flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{problem.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-white/50" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{problem.mentionedIn}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          problem.impact === 'High' ? 'bg-red-500/20 text-red-400' :
                          problem.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {problem.impact} Impact
                        </span>
                      </div>
                    </div>
                    <span className="text-white/30 group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-6 pb-6 pl-20">
                    <h4 className="text-sm font-semibold text-white/50 mb-4 uppercase tracking-wider">Evidence:</h4>
                    <ul className="space-y-3">
                      {problem.evidence.map((quote, j) => (
                        <li key={j} className="text-white/60 text-sm pl-4 border-l-2 border-white/10 italic" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
                          {quote}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Features Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
              </div>
              Recommended Features
            </h2>
            <div className="space-y-4">
              {parsedResults.features.map((feature, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${
                      feature.priority === 'P0' ? 'bg-red-500 text-white' :
                      feature.priority === 'P1' ? 'bg-amber-500 text-black' :
                      'bg-white/10 text-white/50'
                    }`} style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {feature.priority}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl mb-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{feature.feature}</h3>
                      <p className="text-white/60 mb-4" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>{feature.why}</p>
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg text-xs text-white/50">
                        Effort: {feature.effort}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-4 mb-12">
            <button
              onClick={exportToMarkdown}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              <Download className="w-5 h-5" />
              Export Results
            </button>
            <button
              onClick={() => { setAppState('landing'); setAnalysis(''); setParsedResults(null); setUploadedFiles([]); setPastedText([]); }}
              className="flex-1 py-4 bg-gradient-to-r from-amber-400 to-emerald-400 text-black rounded-2xl font-bold hover:shadow-lg hover:shadow-amber-400/25 transition-all"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Try Another Demo
            </button>
          </div>

          {/* Feedback */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Get 50% off as a founding customer
            </h3>
            <p className="text-white/50 mb-6" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
              Join the waitlist for early access and launch discount.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <iframe
                data-tally-src="https://tally.so/r/XxDedj"
                width="100%"
                height="400"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                title="ProdSignal Waitlist"
              />
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white/30 text-sm" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
            ProdSignal — Find signal in customer noise
          </p>
          <p className="text-white/20 text-xs mt-2">
            © 2025 ProdSignal. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Font imports */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600&display=swap');
      `}</style>
    </main>
  );
}
