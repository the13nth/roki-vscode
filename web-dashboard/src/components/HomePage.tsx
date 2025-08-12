'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TypewriterEffect } from '@/components/ui/typewriter-effect';
import { SlidingText } from '@/components/ui/sliding-text';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { 
  Rocket, 
  Brain, 
  Target, 
  Shield, 
  Globe, 
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
  LogIn,
  UserPlus,
  FolderOpen,
  Building2,
  Code,
  Download,
  Flame
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
  const features = [
    {
      icon: <Rocket className="h-8 w-8" />,
      title: "Technical & Business Project Templates",
      description: "Choose from specialized templates for software development (web apps, APIs, mobile) or business initiatives with regulatory compliance frameworks."
    },
    {
      icon: <Layers className="h-8 w-8" />,
      title: "Intelligent Project Setup",
      description: "Technical projects get technology stack recommendations, while business projects receive regulatory guidance and compliance frameworks."
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Intelligent Task Tracking",
      description: "AI-powered task breakdown, automatic progress detection, and visual milestone tracking with smart recommendations."
    },
    {
      icon: <PieChart className="h-8 w-8" />,
      title: "Current Market Analysis & Financial Projections",
      description: "Stay ahead with real-time market insights, emerging technology trends, and up-to-date financial projections. Our AI continuously monitors industry changes to keep your projects competitive."
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Always-Current AI Intelligence",
      description: "Context-aware analysis that adapts to your project type and stays current with evolving business trends, technology advances, and regulatory changes."
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Project Overview",
      description: "Unified dashboard showing all your projects, cross-project insights, portfolio analytics, and team collaboration features."
    },
    {
      icon: <Download className="h-8 w-8" />,
      title: "Complete Data Portability",
      description: "Your data, your choice. Export all analysis to JSON, sync to cloud services, or integrate with spreadsheets. No vendor lock-in, ever."
    },
    {
      icon: <Flame className="h-8 w-8" />,
      title: "Brutally Honest Project Roasting",
      description: "Get unfiltered, reality-check feedback on your ideas. Our AI identifies fundamental flaws, market realities, and provides actionable solutions to fix them."
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "$9",
      period: "/month",
      description: "Perfect for individual developers and small projects",
      features: [
        "Up to 3 projects",
        "Basic AI analysis",
        "Honest project roasting",
        "Technical & business templates",
        "JSON export",
        "Email support"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "Ideal for professional developers and growing teams",
      features: [
        "Unlimited projects",
        "Advanced AI insights",
        "Financial projections & market analysis",
        "AI-powered mitigation strategies",
        "Technical & business templates",
        "Cloud sync & spreadsheet export",
        "VS Code integration",
        "Priority support",
        "Team collaboration"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For teams and organizations with advanced needs",
      features: [
        "Everything in Pro",
        "Custom AI models for technical & business",
        "Advanced portfolio analytics",
        "Enterprise data export & API access",
        "SSO integration",
        "Dedicated support",
        "Custom integrations",
        "On-premise deployment"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Lead Developer",
      company: "TechFlow Inc",
      content: "AI Project Manager transformed how we approach project planning. The market analysis feature alone saved us weeks of research.",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Manager",
      company: "StartupLab",
      content: "The step-by-step project setup is incredible. We went from idea to structured project plan in minutes, not days.",
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
      <header className="border-b bg-white/60 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-black p-2 border-2 border-gray-800">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-black">
                AI Project Manager
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/projects" className="flex items-center text-gray-600 hover:text-gray-900">
                <FolderOpen className="mr-1 h-4 w-4" />
                Projects
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <SignedOut>
                <SignInButton>
                  <Button variant="outline" size="sm" className="border-2 border-gray-800 text-black hover:bg-gray-100">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button size="sm" className="bg-black hover:bg-gray-800 text-white border-2 border-gray-800">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/projects">
                  <Button size="sm" className="bg-black hover:bg-gray-800 text-white border-2 border-gray-800">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    My Projects
                  </Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white/40 border-b-2 border-gray-800 relative">
        <SketchArrow className="top-10 left-20 text-gray-400 rotate-12" />
        <CircuitDiagram className="top-16 right-32 text-gray-300" />
        <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
            <Badge className="mb-6 bg-white/80 text-black border-2 border-gray-800">
              🔥 Now with Brutally Honest Project Roasting & AI Mitigations
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
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
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              The AI-powered platform for both <strong>technical development</strong> and <strong>business initiatives</strong>. 
              In an ever-changing business and technology landscape, you need an assistant that stays on top. 
              Get brutally honest feedback, AI-powered mitigation strategies, financial projections, and intelligent 
              project management tailored to your project type.
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
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 border-gray-800 text-black hover:bg-gray-100">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="font-medium">4.9/5</span> rating
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span className="font-medium">10K+</span> projects created
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="font-medium">95%</span> success rate
              </div>
            </div>
        </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
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
                <div className="text-4xl font-bold text-black mb-2">$50K</div>
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
            From initial concept to market launch, our AI-powered platform provides honest feedback, actionable solutions, and guidance you need at every step. 
            Get brutally honest project roasting with AI-powered mitigation strategies to turn criticism into success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 border-gray-800 hover:border-black transition-all duration-300 bg-white/60 rounded-none relative">
              <CardContent className="p-8">
                {index % 3 === 0 && <SketchArrow className="top-2 right-2 text-gray-400 scale-75" />}
                {index % 3 === 1 && <MeasurementLines className="top-1 left-1 text-gray-300 scale-75" />}
                {index % 3 === 2 && <CircuitDiagram className="top-1 right-1 text-gray-400 scale-50" />}
                <div className="text-black mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
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
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
            <div className="mt-6 p-4 bg-white/70 border-2 border-gray-800 rounded-none max-w-4xl mx-auto relative">
              <SketchArrow className="top-1 right-1 text-gray-300 scale-75" />
              <p className="text-black font-medium">
                ✨ <strong>No Lock-in Promise:</strong> We do not lock you into subscriptions. All your analysis can be synced to cloud, 
                exported to sheets, or downloaded as JSON whenever you want. Your data, your choice.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-4 w-4 text-black mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full border-2 ${plan.popular ? 'bg-black hover:bg-gray-800 text-white border-black' : 'bg-white/80 hover:bg-white/90 text-black border-gray-800'}`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">All plans include 24/7 support and regular updates</p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                30-day money back guarantee
              </div>
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-1" />
                No setup fees
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Cancel anytime
              </div>
              <div className="flex items-center">
                <Download className="h-4 w-4 mr-1" />
                Your data stays yours
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="container mx-auto px-4 py-20 relative">
        <SketchArrow className="top-10 right-10 text-gray-400 rotate-180" />
        <CircuitDiagram className="bottom-10 left-10 text-gray-300" />
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Loved by Teams Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how AI Project Manager is transforming how teams build and launch successful projects.
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

      {/* Final CTA Section */}
      <div className="bg-black py-20 border-t-2 border-gray-800 relative">
        <SketchLine className="top-10 left-20 text-gray-600" />
        <CircuitDiagram className="bottom-10 right-20 text-gray-600" />
        <MeasurementLines className="top-32 right-1/4 text-gray-600" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Projects?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are building better projects faster with AI Project Manager.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <SignedOut>
              <SignUpButton>
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-4 border-2 border-gray-300">
                  <Rocket className="mr-2 h-5 w-5" />
                  Start Your Free Trial
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/projects">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-4 border-2 border-gray-300">
                  <Rocket className="mr-2 h-5 w-5" />
                  Go to Projects
                </Button>
              </Link>
            </SignedIn>
            <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-black text-lg px-8 py-4">
              <MessageSquare className="mr-2 h-5 w-5" />
              Talk to Sales
            </Button>
          </div>
          <p className="text-gray-300 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
