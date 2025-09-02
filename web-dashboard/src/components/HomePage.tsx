'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TypewriterEffect } from '@/components/ui/typewriter-effect';
import { SlidingText } from '@/components/ui/sliding-text';
import { SignedIn, SignedOut, SignUpButton, useUser } from '@clerk/nextjs';
import { UnifiedNavigation } from './UnifiedNavigation';
import { PlanSelectionModal } from './PlanSelectionModal';
import { 
  Rocket, 
  Brain, 
  Target, 
  Shield, 
  Play,
  Check,
  Users,
  TrendingUp,
  CheckCircle,
  Star,
  Crown,
  PieChart,
  Layers,
  MessageSquare,
  Clock,
  Award,
  Building2,
  Code,
  Download,
  Flame,
  Mail,
  Bell,
  Gift,
  Zap,
  ArrowRight,
  Twitter,
  Linkedin,
  Github,
  Instagram
} from 'lucide-react';
import Link from 'next/link';

// Scientific drawing SVG components
const SketchLine = ({ className = "" }: { className?: string }) => (
  <svg className={`absolute ${className}`} width="100" height="50" viewBox="0 0 100 50">
    <path 
      d="M5,25 Q25,15 45,25 T85,20" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none" 
      strokeDasharray="2,3"
      opacity="0.6"
    />
  </svg>
);

const CircuitDiagram = ({ className = "" }: { className?: string }) => (
  <svg className={`absolute ${className}`} width="80" height="60" viewBox="0 0 80 60">
    <circle cx="20" cy="30" r="8" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
    <rect x="35" y="25" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
    <path d="M28,30 L35,30 M45,30 L55,30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path d="M55,25 L55,35 L65,35" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </svg>
);

const MeasurementLines = ({ className = "" }: { className?: string }) => (
  <svg className={`absolute ${className}`} width="60" height="40" viewBox="0 0 60 40">
    <path d="M10,10 L50,10" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <path d="M10,8 L10,12 M50,8 L50,12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <text x="30" y="25" fontSize="8" textAnchor="middle" fill="currentColor" opacity="0.4">42px</text>
  </svg>
);

const SketchArrow = ({ className = "" }: { className?: string }) => (
  <svg className={`absolute ${className}`} width="40" height="30" viewBox="0 0 40 30">
    <path 
      d="M5,15 Q20,10 35,15" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none" 
      opacity="0.5"
      strokeDasharray="1,2"
    />
    <path d="M32,12 L35,15 L32,18" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
  </svg>
);

export function HomePage() {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [vscodeWaitlistEmail, setVscodeWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [vscodeWaitlistStatus, setVscodeWaitlistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [showModal, setShowModal] = useState(false);
  const [modalPlan, setModalPlan] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { user } = useUser();



  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || waitlistStatus === 'submitting') return;

    setWaitlistStatus('submitting');
    
    try {
      // Simulate API call - replace with actual waitlist API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWaitlistStatus('success');
      setWaitlistEmail('');
      
      // Reset status after 3 seconds
      setTimeout(() => setWaitlistStatus('idle'), 3000);
    } catch (error) {
      setWaitlistStatus('error');
      setTimeout(() => setWaitlistStatus('idle'), 3000);
    }
  };

  const handleVscodeWaitlistSubmit = async () => {
    if (!vscodeWaitlistEmail || vscodeWaitlistStatus === 'submitting') return;

    setVscodeWaitlistStatus('submitting');
    
    try {
      // Add email to Pinecone waitlist
      const response = await fetch('/api/waitlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: vscodeWaitlistEmail,
          type: 'vscode-extension'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add email to waitlist');
      }

      setVscodeWaitlistStatus('success');
      setVscodeWaitlistEmail('');
      
      // Reset status after 3 seconds
      setTimeout(() => setVscodeWaitlistStatus('idle'), 3000);
    } catch (error) {
      setVscodeWaitlistStatus('error');
      setTimeout(() => setVscodeWaitlistStatus('idle'), 3000);
    }
  };

  // Countdown timer for VS Code extension release
  useEffect(() => {
    const targetDate = new Date('2025-10-01T00:00:00Z');
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch waitlist emails when component mounts


  const scrollToWaitlist = () => {
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePlanSelection = (plan: any) => {
    if (!user) {
      // Redirect to sign up if not logged in
      window.location.href = '/sign-up';
      return;
    }

    setModalPlan(plan);
    setShowModal(true);
  };

  const handleConfirmSubscription = async (planId: string, period: 'monthly' | 'yearly') => {
    try {
      setModalLoading(true);
      
      const response = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          planId,
          period
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError('Failed to update subscription. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };
  const features = [
    {
      icon: <Rocket className="h-8 w-8" />,
      title: "Technical & Business Project Templates",
      description: "Choose from specialized templates for software development (web apps, APIs, mobile) or business initiatives with regulatory compliance frameworks."
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Advanced AI Analysis Suite",
      description: "Get comprehensive technical, market, competitive, and financial analysis. Each analysis is automatically saved and embedded for use in social media content generation and future insights."
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Smart Task Management & Progress Tracking",
      description: "AI-powered task breakdown with automatic progress detection, visual milestone tracking, and intelligent recommendations. Tasks adapt to your project type and complexity."
    },
    {
      icon: <PieChart className="h-8 w-8" />,
      title: "Real-Time Market Intelligence & Financial Modeling",
      description: "Stay ahead with live market insights, emerging technology trends, competitive landscape analysis, and detailed financial projections with ROI calculations and funding requirements."
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "AI-Powered Social Media Content Generation",
      description: "Generate platform-specific social media posts automatically using your saved analysis data. Create engaging content for Twitter, LinkedIn, Instagram, and more with context-aware AI."
    },
    {
      icon: <Layers className="h-8 w-8" />,
      title: "Business Model Canvas & Strategic Planning",
      description: "Generate comprehensive business model canvases, strategic frameworks, and competitive differentiation analysis. Visual tools help you understand your business from every angle."
    },
    {
      icon: <Flame className="h-8 w-8" />,
      title: "Brutally Honest Project Roasting + AI Mitigations",
      description: "Get unfiltered, reality-check feedback on your ideas with AI-generated mitigation strategies. Turn harsh criticism into actionable improvements with specific solutions."
    },
    {
      icon: <Download className="h-8 w-8" />,
      title: "Complete Data Portability & Cloud Sync",
      description: "Your data, your choice. Export all analysis to JSON, sync to Pinecone cloud, integrate with spreadsheets, or share via VS Code extension. Zero vendor lock-in, ever."
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "VS Code Extension Integration",
      description: "Seamlessly integrate ROKI into your development workflow with our powerful VS Code extension. Manage projects, track progress, and access AI insights without leaving your editor."
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Local Language Support",
      description: "Prompt in your own language with full support for Kiswahili and Kinyarwanda, making ROKI accessible to East African users."
    }
  ];

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      period: "monthly",
      description: "Perfect for getting started with AI-powered project analysis",
      features: [
        "500K tokens per month",
        "2 project creations",
        "2 analyses per section",
        "5 social media posts",
        "Basic AI analysis (Technical, Market)",
        "Saved analysis insights",
        "JSON export",
        "VS Code extension access",
        "Email support"
      ],
      limits: {
        tokens: 500000,
        projects: 2,
        analysesPerSection: 2,
        socialPosts: 5,
        priority: false,
        support: 'email'
      },
      popular: false,
      cta: "Get Started Free"
    },
    {
      id: "starter",
      name: "Starter",
      price: 9.99,
      period: "monthly",
      description: "Ideal for individual developers and small projects",
      features: [
        "2M tokens per month",
        "10 projects",
        "5 analyses per section",
        "25 social media posts",
        "Advanced AI analysis (Technical, Market, Financial)",
        "Enhanced insights & embeddings",
        "Social media generation (all platforms)",
        "VS Code extension with cloud sync",
        "Priority support"
      ],
      limits: {
        tokens: 2000000,
        projects: 10,
        analysesPerSection: 5,
        socialPosts: 25,
        priority: true,
        support: 'priority'
      },
      popular: true,
      cta: "Start Free Trial"
    },
    {
      id: "professional",
      name: "Professional",
      price: 29.99,
      period: "monthly",
      description: "Perfect for professional developers and growing teams",
      features: [
        "10M tokens per month",
        "Unlimited projects",
        "Unlimited analyses per section",
        "100 social media posts",
        "Full AI analysis suite (Technical, Market, Financial, BMC)",
        "Advanced insights & semantic embeddings",
        "Business Model Canvas generation",
        "VS Code extension with advanced features",
        "Dedicated support"
      ],
      limits: {
        tokens: 10000000,
        projects: -1,
        analysesPerSection: -1,
        socialPosts: 100,
        priority: true,
        support: 'dedicated'
      },
      popular: false,
      cta: "Start Free Trial"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 99.99,
      period: "monthly",
      description: "For large teams and organizations with advanced needs",
      features: [
        "50M tokens per month",
        "Unlimited projects",
        "Unlimited analyses per section",
        "Unlimited social media posts",
        "Everything in Professional",
        "Custom AI models & analysis types",
        "Advanced portfolio analytics",
        "VS Code extension with enterprise features",
        "Dedicated success manager"
      ],
      limits: {
        tokens: 50000000,
        projects: -1,
        analysesPerSection: -1,
        socialPosts: -1,
        priority: true,
        support: 'dedicated'
      },
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const testimonials = [
    {
      name: "Germain R.",
      role: "CTO",
      company: "HarakaPlus",
      content: "ROKI transformed how we approach project planning. The BMC analysis feature alone saved us HOURS of research.",
      avatar: "GR"
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Manager",
      company: "StartupLab",
      content: "The step-by-step project setup is incredible. We went from idea to structured project plan in minutes, not days. The VS Code extension keeps our dev team perfectly synced.",
      avatar: "MR"
    },
    {
      name: "Emily Thompson",
      role: "Engineering Manager",
      company: "ScaleUp Co",
      content: "Finally, a tool that understands the entire project lifecycle. The global overview helps us manage our entire portfolio effectively.",
      avatar: "ET"
    }
  ];

  return (
    <div className="min-h-screen bg-white/30 relative overflow-hidden">
      {/* Scientific drawing background elements */}
      <SketchLine className="top-20 left-10 text-gray-400" />
      <CircuitDiagram className="top-32 right-20 text-gray-300" />
      <MeasurementLines className="top-60 left-1/4 text-gray-400" />
      <SketchArrow className="top-80 right-1/3 text-gray-400" />
      <SketchLine className="top-96 left-2/3 text-gray-300 rotate-45" />
      <CircuitDiagram className="bottom-40 left-10 text-gray-400" />
      <MeasurementLines className="bottom-20 right-10 text-gray-300" />
      
      {/* Navigation */}
      <UnifiedNavigation variant="homepage" />

      {/* Hero Section */}
      <div className="bg-white/40 border-b-2 border-gray-800 relative">
        <SketchArrow className="top-10 left-20 text-gray-400 rotate-12" />
        <CircuitDiagram className="top-16 right-32 text-gray-300" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 md:mb-6 bg-white/80 text-black border-2 border-gray-800 text-xs md:text-sm">
              Sign up today for one week of free access!
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-4 md:mb-6">
              Turn <TypewriterEffect 
                words={[
                  'Ideas', 
                  'Apps', 
                  'Business Ideas', 
                  'Hobbies',
                ]} 
                typeSpeed={120} 
                deleteSpeed={60} 
                delayBetweenWords={3000}
                className="text-black"
              /> Into 
              <br />
              <SlidingText 
                words={['Successful Projects', 'Businesses', 'Learning Experiences', 'Growth Opportunities','a Career']}
                className="text-black"
                slideSpeed={600}
                delayBetweenSlides={5000}
              />
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 md:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
              The complete AI-powered platform for <strong>technical development</strong> and <strong>business initiatives</strong>. 
              Get comprehensive analysis, saved insights, social media content generation, and brutally honest feedback with AI-powered mitigation strategies. 
              From concept to launch, with intelligent project management that adapts to your needs. 
              <strong>Plus, integrate directly into VS Code</strong> for seamless development workflow integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <SignedOut>
                <SignUpButton>
                  <Button size="lg" className="bg-black hover:bg-gray-800 text-white text-lg px-8 py-4 border-2 border-gray-800">
                    <Rocket className="mr-2 h-5 w-5" />
                    Start Building Today
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/projects">
                  <Button size="lg" className="bg-black hover:bg-gray-800 text-white text-lg px-8 py-4 border-2 border-gray-800">
                    <Rocket className="mr-2 h-5 w-5" />
                    Go to Projects
                  </Button>
                </Link>
              </SignedIn>
            </div>
            
            {/* YouTube Video Demo */}
            <div className="flex justify-center mb-12">
              <div className="w-full max-w-4xl">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full border-2 border-gray-800 rounded-none"
                    src="https://www.youtube.com/embed/WzumphMONDw?vq=hd720"
                    title="ROKI Project Manager Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 md:space-x-8 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="font-medium">4.9/5</span> rating
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span className="font-medium">100+</span> projects created and counting...
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="font-medium">95%</span> success rate
              </div>
            </div>
        </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-2 border-gray-800 bg-white/70 rounded-none relative">
              <MeasurementLines className="top-2 right-2 text-gray-400" />
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-black mb-2">3x</div>
                <div className="text-gray-600">Faster Project Setup</div>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-gray-800 bg-white/70 rounded-none relative">
              <SketchLine className="top-1 left-2 text-gray-300" />
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-black mb-2">90%</div>
                <div className="text-gray-600">Time Saved on Planning</div>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-gray-800 bg-white/70 rounded-none relative">
              <CircuitDiagram className="top-1 right-1 text-gray-400 scale-75" />
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-black mb-2">$10K</div>
                <div className="text-gray-600">Average Value Created</div>
              </CardContent>
            </Card>
          </div>
                    </div>
                  </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-20 relative">
        <SketchLine className="top-10 right-20 text-gray-300 rotate-12" />
        <CircuitDiagram className="top-32 left-10 text-gray-400" />
        <MeasurementLines className="bottom-20 right-1/4 text-gray-300" />
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need to Build 
            <span className="text-black"> Successful Projects</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From initial concept to market launch, our AI-powered platform provides comprehensive analysis, saved insights for social media generation, 
            and honest feedback with actionable solutions at every step. Turn analysis into action with intelligent project management and content creation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 border-gray-800 hover:border-black transition-all duration-300 bg-white/60 rounded-none relative">
              <CardContent className="p-4 md:p-6 lg:p-8">
                {index % 3 === 0 && <SketchArrow className="top-2 right-2 text-gray-400 scale-75" />}
                {index % 3 === 1 && <MeasurementLines className="top-1 left-1 text-gray-300 scale-75" />}
                {index % 3 === 2 && <CircuitDiagram className="top-1 right-1 text-gray-400 scale-50" />}
                <div className="text-black mb-4 md:mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">{feature.title}</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* VS Code Extension Section */}
        <div className="bg-white/50 border-2 border-gray-800 p-8 mb-20 rounded-none relative">
          <SketchLine className="top-4 left-4 text-gray-400" />
          <CircuitDiagram className="bottom-4 right-4 text-gray-300" />
          
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              VS Code Extension - Development Made Seamless
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Integrate ROKI directly into your development workflow with our powerful VS Code extension. 
              Manage projects, track progress, and access AI insights without leaving your editor.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Core Features */}
            <Card className="border-2 border-gray-800 bg-white/60 rounded-none relative">
              <MeasurementLines className="top-2 right-2 text-gray-400" />
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Code className="h-8 w-8 text-black mr-3" />
                  <h4 className="text-xl font-semibold text-gray-900">Core Development Features</h4>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Interactive Project Dashboard with real-time sync
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Smart task management with AI-powered insights
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Requirements and design document management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Cloud project synchronization and backup
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    AI context injection for enhanced development
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Advanced Capabilities */}
            <Card className="border-2 border-gray-800 bg-white/60 rounded-none relative">
              <SketchArrow className="top-2 left-2 text-gray-300 rotate-45" />
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Zap className="h-8 w-8 text-black mr-3" />
                  <h4 className="text-xl font-semibold text-gray-900">Advanced Capabilities</h4>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Intelligent progress tracking and analytics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Automated project state updates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Conflict resolution and merge management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    File watcher for real-time project monitoring
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Seamless integration with web dashboard
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Extension Benefits */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-none border-2 border-gray-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-black" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Team Collaboration</h4>
              <p className="text-sm text-gray-600">Real-time sync keeps your team aligned with cloud-based project management</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-none border-2 border-gray-800 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-black" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Performance Optimized</h4>
              <p className="text-sm text-gray-600">Smart refresh system reduces unnecessary API calls by 60-80%</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-none border-2 border-gray-800 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-black" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Enterprise Ready</h4>
              <p className="text-sm text-gray-600">secure authentication and data sync</p>
            </div>
          </div>

          {/* Local Language Support */}
          <div className="bg-gray-100 border-2 border-gray-800 p-6 mb-8 rounded-none relative">
            <SketchLine className="top-2 left-2 text-gray-400" />
            <div className="text-center mb-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Prompt in Your Own Language</h4>
              <p className="text-gray-600">ROKI supports multiple local languages for a truly inclusive experience</p>
            </div>
            
            {/* Current Languages */}
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 text-center">Currently Supported</h5>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="w-16 h-12 mx-auto mb-3 rounded-none flex items-center justify-center border-2 border-gray-800">
                    <img src="/tz.svg" alt="Tanzania Flag" className="w-full h-full object-cover" />
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1">Kiswahili</h5>
                  <p className="text-sm text-gray-600">Full language support for East African users</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-12 mx-auto mb-3 rounded-none flex items-center justify-center border-2 border-gray-800">
                    <img src="/rw.svg" alt="Rwanda Flag" className="w-full h-full object-cover" />
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1">Kinyarwanda</h5>
                  <p className="text-sm text-gray-600">Complete language support for Rwandan users</p>
                </div>
              </div>
            </div>

            {/* Upcoming Languages */}
            <div>
              <h5 className="text-lg font-semibold text-gray-900 mb-4 text-center">Coming Soon</h5>
              <div className="grid md:grid-cols-1 gap-4">
                <div className="text-center">
                  <div className="w-16 h-12 mx-auto mb-3 rounded-none flex items-center justify-center border-2 border-gray-800">
                    <img src="/ps.svg" alt="Palestine Flag" className="w-full h-full object-cover" />
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1">العربية</h5>
                  <p className="text-sm text-gray-600">Arabic language support</p>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="text-center mt-8 mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-4">Extension Release Countdown</h4>
            <p className="text-gray-600 mb-6">The VS Code extension launches on October 1st, 2025</p>
            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              <div className="bg-white border-2 border-gray-800 p-4 rounded-none">
                <div className="text-2xl font-bold text-black">{countdown.days}</div>
                <div className="text-sm text-gray-600">Days</div>
              </div>
              <div className="bg-white border-2 border-gray-800 p-4 rounded-none">
                <div className="text-2xl font-bold text-black">{countdown.hours}</div>
                <div className="text-sm text-gray-600">Hours</div>
              </div>
              <div className="bg-white border-2 border-gray-800 p-4 rounded-none">
                <div className="text-2xl font-bold text-black">{countdown.minutes}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="bg-white border-2 border-gray-800 p-4 rounded-none">
                <div className="text-2xl font-bold text-black">{countdown.seconds}</div>
                <div className="text-sm text-gray-600">Seconds</div>
              </div>
            </div>
          </div>

          {/* Waitlist CTA */}
          <div className="text-center mt-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-4">Join the Waitlist</h4>
            <p className="text-gray-600 mb-6">Be among the first to get access to our VS Code extension</p>
            <div className="max-w-md mx-auto">
              <div className="flex gap-3">
                <Input 
                  type="email" 
                  placeholder="Enter your email address"
                  value={vscodeWaitlistEmail}
                  onChange={(e) => setVscodeWaitlistEmail(e.target.value)}
                  className="flex-1 border-2 border-gray-800 rounded-none bg-white"
                />
                <Button 
                  onClick={handleVscodeWaitlistSubmit}
                  disabled={vscodeWaitlistStatus === 'submitting'}
                  className="bg-black hover:bg-gray-800 text-white border-2 border-gray-800 px-6 py-2 rounded-none disabled:opacity-50"
                  size="default"
                >
                  {vscodeWaitlistStatus === 'submitting' ? 'Joining...' : 'Join'}
                </Button>
              </div>
              
              {/* Status Messages */}
              {vscodeWaitlistStatus === 'success' && (
                <p className="text-sm text-green-600 mt-3">
                  ✓ You've been added to the VS Code extension waitlist!
                </p>
              )}
              {vscodeWaitlistStatus === 'error' && (
                <p className="text-sm text-red-600 mt-3">
                  ✗ Something went wrong. Please try again.
                </p>
              )}
              
              <p className="text-sm text-gray-600 mt-3">
                Get notified when the extension launches • Free • Open Source
              </p>
            </div>
          </div>
        </div>

        {/* Project Types Section */}
        <div className="bg-white/50 border-2 border-gray-800 p-8 mb-20 rounded-none relative">
          <SketchLine className="top-4 left-4 text-gray-400" />
          <CircuitDiagram className="bottom-4 right-4 text-gray-300" />
          
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Every Type of Project
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're building software or launching a business, our AI adapts to provide specialized insights and guidance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Technical Projects */}
            <Card className="border-2 border-gray-800 bg-white/60 rounded-none relative">
              <MeasurementLines className="top-2 right-2 text-gray-400" />
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Code className="h-8 w-8 text-black mr-3" />
                  <h4 className="text-xl font-semibold text-gray-900">Technical Projects</h4>
                </div>
                <p className="text-gray-600 mb-4">
                  Perfect for software development, web apps, APIs, and mobile applications.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Technology stack recommendations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Development cost analysis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Technical market research
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Architecture planning
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Code quality insights
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    AI-powered mitigation strategies
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Social media content generation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    VS Code extension integration
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Business Projects */}
            <Card className="border-2 border-gray-800 bg-white/60 rounded-none relative">
              <SketchArrow className="top-2 left-2 text-gray-300 rotate-45" />
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Building2 className="h-8 w-8 text-black mr-3" />
                  <h4 className="text-xl font-semibold text-gray-900">Business Projects</h4>
                </div>
                <p className="text-gray-600 mb-4">
                  Ideal for business initiatives, process improvements, and operational launches.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Regulatory compliance frameworks
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Financial projections & planning
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Industry landscape analysis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Strategic business insights
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Operational cost breakdown
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Brutal honesty & reality checks
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Business Model Canvas generation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-black mr-2" />
                    Social media marketing content
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-white/40 py-20 border-t-2 border-gray-800 relative">
        <SketchLine className="top-10 left-10 text-gray-400" />
        <CircuitDiagram className="top-20 right-20 text-gray-300" />
        <MeasurementLines className="bottom-32 left-1/3 text-gray-400" />
        
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Choose Your Future Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join the waitlist to be notified when these plans become available. Early access members get special launch pricing.
            </p>
            <div className="mt-6 p-4 bg-white/70 border-2 border-gray-800 rounded-none max-w-4xl mx-auto relative">
              <SketchArrow className="top-1 right-1 text-gray-300 scale-75" />
              <p className="text-black font-medium">
                ✨ <strong>No Lock-in Promise:</strong> We do not lock you into subscriptions. All your analysis can be synced to cloud, 
                exported to sheets, or downloaded as JSON whenever you want. Your data, your choice.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative border-2 transition-all duration-300 rounded-none bg-white/60 ${plan.popular ? 'border-black' : 'border-gray-800 hover:border-black'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white border-2 border-gray-800">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                {index === 0 && <MeasurementLines className="top-2 right-2 text-gray-400 scale-75" />}
                {index === 1 && <CircuitDiagram className="top-1 left-1 text-gray-300 scale-50" />}
                {index === 2 && <SketchLine className="top-3 right-3 text-gray-400 scale-75" />}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    <span className="text-gray-600 ml-1">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col h-full">
                  <ul className="space-y-3 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-4 w-4 text-black mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button 
                      onClick={() => handlePlanSelection(plan)}
                      className={`w-full border-2 ${plan.popular ? 'bg-black hover:bg-gray-800 text-white border-black' : 'bg-white/80 hover:bg-white/90 text-black border-gray-800'}`}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">All plans will include 24/7 support and regular updates when launched</p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Bell className="h-4 w-4 mr-1" />
                Early access notifications
              </div>
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-1" />
                Special launch pricing
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                No commitment required
              </div>
              <div className="flex items-center">
                <Download className="h-4 w-4 mr-1" />
                Your data stays yours
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedPlan={modalPlan}
        onConfirm={handleConfirmSubscription}
        loading={modalLoading}
      />

      {/* Testimonials Section */}
      <div className="container mx-auto px-4 py-20 relative">
        <SketchArrow className="top-10 right-10 text-gray-400 rotate-180" />
        <CircuitDiagram className="bottom-10 left-10 text-gray-300" />
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Loved by Teams Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how ROKI is transforming how teams build and launch successful projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-2 border-gray-800 rounded-none relative bg-white/60">
              {index === 0 && <SketchLine className="top-2 left-2 text-gray-400 scale-75" />}
              {index === 1 && <MeasurementLines className="top-1 right-1 text-gray-300 scale-75" />}
              {index === 2 && <CircuitDiagram className="bottom-1 left-1 text-gray-400 scale-50" />}
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-black fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-black border-2 border-gray-800 flex items-center justify-center text-white font-semibold mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>



      {/* Waitlist Section */}
      <div id="waitlist-section" className="bg-white/40 py-20 border-t-2 border-gray-800 relative">
        <SketchLine className="top-16 left-16 text-gray-400 rotate-45" />
        <CircuitDiagram className="bottom-16 right-16 text-gray-300" />
        <MeasurementLines className="top-32 right-1/3 text-gray-400" />
        
        
      </div>

      {/* Footer */}
      <footer className="bg-black py-12 border-t-2 border-gray-800 relative">
        <SketchLine className="top-6 left-12 text-gray-600" />
        <CircuitDiagram className="top-8 right-16 text-gray-600" />
        <MeasurementLines className="bottom-6 left-1/3 text-gray-600" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Logo and Description */}
            <div className="mb-6 md:mb-0">
              <Link href="/" className="flex items-center space-x-2 mb-3">
                <div className="bg-white p-2 border-2 border-gray-300">
                  <Brain className="h-5 w-5 text-black" />
                </div>
                <span className="font-semibold text-lg text-white">
                  ROKI Project Manager
                </span>
              </Link>
              <p className="text-gray-400 text-sm max-w-md">
                The complete AI-powered platform for technical development and business initiatives.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex flex-col items-center md:items-end">
              <div className="flex items-center space-x-4 mb-4">
                {/* <a 
                  href="https://twitter.com/aiprojectmgr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors p-2 border border-gray-700 hover:border-gray-500 rounded-none"
                >
                  <Twitter className="h-5 w-5" />
                </a> */}
                <a 
                  href="https://www.linkedin.com/company/rokiai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors p-2 border border-gray-700 hover:border-gray-500 rounded-none"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                {/* <a 
                  href="https://github.com/ai-project-manager" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors p-2 border border-gray-700 hover:border-gray-500 rounded-none"
                >
                  <Github className="h-5 w-5" />
                </a> */}
                {/* <a 
                  href="https://instagram.com/aiprojectmanager" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors p-2 border border-gray-700 hover:border-gray-500 rounded-none"
                >
                  <Instagram className="h-5 w-5" />
                </a> */}
              </div>
              
              {/* Navigation Links */}
              <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 mt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} ROKI Project Manager. All rights reserved. 
              <span className="ml-2">Built with intelligence, designed for success.</span>
          </p>
        </div>
      </div>
      </footer>
    </div>
  );
}
