'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Brain,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  Lightbulb,
  Target,
  Clock,
  Zap,
  Star,
  Rocket,
  DollarSign,
  Flame,
  Shield,
  Grid3X3,
  Expand,
  Eye,
  Presentation,
  ChevronDown,
  ChevronRight,
  Calculator,
  BarChart3,
  PieChart,
  LineChart,
  Building2,
  Users,
  CreditCard,
  TrendingDown,
  Activity,
  HelpCircle,
  Sparkles,
  Save
} from 'lucide-react';

interface FinancialAnalysisProps {
  projectId: string;
  isOwned?: boolean;
}

interface FinancialData {
  revenueProjections: any;
  keyFactors: any;
  cogs: any;
  operatingExpenses: any;
  incomeStatement: any;
  cashFlow: any;
  kpis: any;
  breakeven: any;
  scenarios: any;
  timestamp: string;
}

interface Question {
  id: string;
  step: number;
  category: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

const FINRO_STEPS = [
  { id: 1, title: 'Revenue Projections', description: 'Highlighting methods to forecast future sales' },
  { id: 2, title: 'Key Factors Influencing Revenue', description: 'Diving into customer acquisition costs, pricing models, churn rates' },
  { id: 3, title: 'Cost of Revenues / COGS', description: 'Analyzing production and material costs' },
  { id: 4, title: 'Operating Expenses', description: 'Detailing personnel and other business costs' },
  { id: 5, title: 'Income Statement Construction', description: 'Showcasing profitability and improvement areas' },
  { id: 6, title: 'Cash Flow and Balance Sheet Analysis', description: 'Focusing on cash inflows and outflows and snapshot of financial position' },
  { id: 7, title: 'KPIs', description: 'Defining key operating indicators and major metrics' },
  { id: 8, title: 'Breakeven Analysis', description: 'Identifying revenue-expense balance point' },
  { id: 9, title: 'Scenario Analysis', description: 'Assessing resilience under various conditions' }
];

export function FinancialAnalysis({ projectId, isOwned = true }: FinancialAnalysisProps) {
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [bmcDataLoaded, setBmcDataLoaded] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [improveDetails, setImproveDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<FinancialData | null>(null);
  const [hasSavedAnalysis, setHasSavedAnalysis] = useState(false);

  // Load existing context and generate questions
  useEffect(() => {
    loadContextAndGenerateQuestions();
    loadBMCData();
    loadSavedAnalysis();
  }, [projectId]);

  const loadContextAndGenerateQuestions = async () => {
    try {
      setIsGeneratingQuestions(true);
      
      // Load project context
      const contextResponse = await fetch(`/api/projects/${projectId}/context/full`);
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        setContext(JSON.stringify(contextData, null, 2));
      }

      // Generate questions based on context
      const questionsResponse = await fetch(`/api/projects/${projectId}/financial/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: context })
      });

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions || []);
      }
    } catch (error) {
      console.error('Error loading context and generating questions:', error);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Helper function to generate product/service costs from BMC data
  const generateProductCostsFromBMC = (bmc: any) => {
    const segments = bmc.customerSegments || '';
    const revenueStreams = bmc.revenueStreams || '';
    const costStructure = bmc.costStructure || '';
    const keyResources = bmc.keyResources || '';
    
    let productCosts = `Direct Product/Service Costs:\n\n`;
    
    // Technology Platform Costs
    productCosts += `**Technology Platform Costs:**\n`;
    productCosts += `• Hosting & Infrastructure: $[X] per month\n`;
    productCosts += `• Payment Processing: 2-3% of transaction value\n`;
    productCosts += `• Third-party APIs & Services: $[X] per month\n`;
    productCosts += `• Mobile App Maintenance: $[X] per month\n`;
    productCosts += `• Database & Storage: $[X] per month\n\n`;
    
    // E-Mobility Specific Costs
    if (segments.includes('Drivers') || segments.includes('Moto-Taxi')) {
      productCosts += `**E-Mobility Platform Costs:**\n`;
      productCosts += `• Vehicle Maintenance Support: $[X] per month\n`;
      productCosts += `• Insurance Processing: $[X] per month\n`;
      productCosts += `• Driver Training & Support: $[X] per month\n`;
      productCosts += `• GPS & Tracking Services: $[X] per month\n`;
      productCosts += `• Customer Support: $[X] per month\n\n`;
    }
    
    // Investment Platform Costs
    if (segments.includes('Investors')) {
      productCosts += `**Investment Platform Costs:**\n`;
      productCosts += `• Investment Processing: $[X] per month\n`;
      productCosts += `• Financial Reporting: $[X] per month\n`;
      productCosts += `• Compliance & Legal: $[X] per month\n`;
      productCosts += `• Portfolio Management Tools: $[X] per month\n\n`;
    }
    
    // Operational Costs
    productCosts += `**Operational Costs:**\n`;
    productCosts += `• Customer Onboarding: $[X] per new customer\n`;
    productCosts += `• Account Management: $[X] per month\n`;
    productCosts += `• Security & Fraud Prevention: $[X] per month\n`;
    productCosts += `• Data Analytics & Reporting: $[X] per month\n\n`;
    
    // Add context from BMC
    if (costStructure) {
      productCosts += `**Cost Structure Context:**\n${costStructure}\n\n`;
    }
    
    if (keyResources) {
      productCosts += `**Key Resources Context:**\n${keyResources}\n\n`;
    }
    
    productCosts += `**Cost Optimization Strategies:**\n`;
    productCosts += `• Implement usage-based pricing for scalable costs\n`;
    productCosts += `• Negotiate volume discounts with service providers\n`;
    productCosts += `• Automate customer onboarding to reduce manual costs\n`;
    productCosts += `• Monitor and optimize third-party service usage\n`;
    
    return productCosts;
  };
  
  // Helper function to generate funding plans from BMC data
  const generateFundingPlansFromBMC = (bmc: any) => {
    const segments = bmc.customerSegments || '';
    const revenueStreams = bmc.revenueStreams || '';
    const partnerships = bmc.keyPartnerships || '';
    const valueProp = bmc.valueProposition || '';
    
    let fundingPlans = `Funding Plans and Timeline:\n\n`;
    
    // Current Funding Status
    fundingPlans += `**Current Funding Status:**\n`;
    fundingPlans += `• Current Cash Position: $[X] (to be determined)\n`;
    fundingPlans += `• Monthly Burn Rate: $[X] (to be determined)\n`;
    fundingPlans += `• Runway: [X] months (to be calculated)\n\n`;
    
    // Funding Rounds Timeline
    fundingPlans += `**Proposed Funding Rounds:**\n\n`;
    
    fundingPlans += `**Pre-Seed Round (Months 0-6):**\n`;
    fundingPlans += `• Target Amount: $50,000 - $100,000\n`;
    fundingPlans += `• Purpose: MVP development, initial team, market validation\n`;
    fundingPlans += `• Investors: Friends, family, angel investors, grants\n`;
    fundingPlans += `• Milestones: Platform launch, first 100 users\n\n`;
    
    fundingPlans += `**Seed Round (Months 6-18):**\n`;
    fundingPlans += `• Target Amount: $250,000 - $500,000\n`;
    fundingPlans += `• Purpose: Market expansion, team growth, technology scaling\n`;
    fundingPlans += `• Investors: Local VCs, impact investors, development banks\n`;
    fundingPlans += `• Milestones: 1,000+ users, revenue generation, partnerships\n\n`;
    
    fundingPlans += `**Series A (Months 18-36):**\n`;
    fundingPlans += `• Target Amount: $1,000,000 - $2,000,000\n`;
    fundingPlans += `• Purpose: Regional expansion, advanced features, team scaling\n`;
    fundingPlans += `• Investors: International VCs, strategic investors\n`;
    fundingPlans += `• Milestones: Multi-city presence, profitability, 10,000+ users\n\n`;
    
    // Funding Sources
    fundingPlans += `**Potential Funding Sources:**\n`;
    fundingPlans += `• **Local Investors:** Rwandan angel investors, family offices\n`;
    fundingPlans += `• **Impact Investors:** Focused on sustainable transportation\n`;
    fundingPlans += `• **Development Banks:** AfDB, IFC, local development banks\n`;
    fundingPlans += `• **Government Grants:** Innovation funds, green technology grants\n`;
    fundingPlans += `• **Corporate Partnerships:** Strategic investments from mobility companies\n`;
    fundingPlans += `• **Crowdfunding:** Local and international crowdfunding platforms\n\n`;
    
    // Use Case for Funding
    if (valueProp) {
      fundingPlans += `**Value Proposition for Investors:**\n${valueProp}\n\n`;
    }
    
    // Partnership Opportunities
    if (partnerships) {
      fundingPlans += `**Strategic Partnership Opportunities:**\n${partnerships}\n\n`;
    }
    
    // Risk Mitigation
    fundingPlans += `**Funding Risk Mitigation:**\n`;
    fundingPlans += `• Diversify funding sources to reduce dependency\n`;
    fundingPlans += `• Maintain 18+ months runway at all times\n`;
    fundingPlans += `• Build strong investor relationships early\n`;
    fundingPlans += `• Demonstrate clear path to profitability\n`;
    fundingPlans += `• Maintain detailed financial reporting and transparency\n`;
    
    return fundingPlans;
  };

  // Helper function to generate KPIs from BMC data
  const generateKPIsFromBMC = (bmc: any) => {
    const segments = bmc.customerSegments || '';
    const revenueStreams = bmc.revenueStreams || '';
    const valueProp = bmc.valueProposition || '';
    
    let kpis = `Key Performance Indicators for E-Mobility Platform:\n\n`;
    
    // Financial KPIs
    kpis += `**Financial Metrics:**\n`;
    kpis += `• Monthly Recurring Revenue (MRR) - Target: [To be determined]\n`;
    kpis += `• Customer Acquisition Cost (CAC) - Target: [To be determined]\n`;
    kpis += `• Customer Lifetime Value (CLV) - Target: [To be determined]\n`;
    kpis += `• Gross Revenue Retention Rate - Target: >90%\n`;
    kpis += `• Net Revenue Retention Rate - Target: >110%\n\n`;
    
    // Operational KPIs
    kpis += `**Operational Metrics:**\n`;
    if (segments.includes('Drivers') || segments.includes('Moto-Taxi')) {
      kpis += `• Active Drivers per Month - Target: [To be determined]\n`;
      kpis += `• Average Rides per Driver per Day - Target: [To be determined]\n`;
      kpis += `• Driver Retention Rate - Target: >85%\n`;
      kpis += `• Vehicle Utilization Rate - Target: >70%\n`;
    }
    
    if (segments.includes('Investors')) {
      kpis += `• Investor Satisfaction Score - Target: >4.5/5\n`;
      kpis += `• Return on Investment (ROI) - Target: [To be determined]\n`;
      kpis += `• Investment Growth Rate - Target: [To be determined]\n`;
    }
    
    kpis += `• Platform Uptime - Target: >99.5%\n`;
    kpis += `• Customer Support Response Time - Target: <2 hours\n\n`;
    
    // Growth KPIs
    kpis += `**Growth Metrics:**\n`;
    kpis += `• Monthly Active Users Growth Rate - Target: [To be determined]\n`;
    kpis += `• Market Share in Target Region - Target: [To be determined]\n`;
    kpis += `• New Customer Acquisition Rate - Target: [To be determined]\n`;
    kpis += `• Revenue Growth Rate - Target: [To be determined]\n\n`;
    
    // Impact KPIs
    kpis += `**Impact Metrics:**\n`;
    kpis += `• CO2 Emissions Reduced (tons/month) - Target: [To be determined]\n`;
    kpis += `• Jobs Created - Target: [To be determined]\n`;
    kpis += `• Community Impact Score - Target: [To be determined]\n`;
    
    return kpis;
  };
  
  // Helper function to generate industry benchmarks from BMC data
  const generateBenchmarksFromBMC = (bmc: any) => {
    const segments = bmc.customerSegments || '';
    const revenueStreams = bmc.revenueStreams || '';
    
    let benchmarks = `Industry Benchmarks for E-Mobility & Investment Platforms:\n\n`;
    
    // E-Mobility Industry Benchmarks
    benchmarks += `**E-Mobility Industry Standards:**\n`;
    benchmarks += `• Driver Utilization Rate: 60-80% (industry average)\n`;
    benchmarks += `• Customer Acquisition Cost: $50-200 (varies by market)\n`;
    benchmarks += `• Commission Rate: 10-25% (platform standard)\n`;
    benchmarks += `• Vehicle ROI: 12-24 months (typical payback period)\n`;
    benchmarks += `• Customer Retention: 70-85% (annual retention rate)\n\n`;
    
    // Investment Platform Benchmarks
    if (segments.includes('Investors')) {
      benchmarks += `**Investment Platform Standards:**\n`;
      benchmarks += `• Management Fee: 1-3% annually (industry standard)\n`;
      benchmarks += `• Expected ROI: 8-15% annually (sustainable returns)\n`;
      benchmarks += `• Investment Minimum: $100-10,000 (varies by platform)\n`;
      benchmarks += `• Investor Satisfaction: >4.0/5 (platform standard)\n`;
      benchmarks += `• Transparency Score: >90% (reporting frequency)\n\n`;
    }
    
    // Technology Platform Benchmarks
    benchmarks += `**Technology Platform Standards:**\n`;
    benchmarks += `• App Store Rating: >4.0/5 (user experience)\n`;
    benchmarks += `• Platform Uptime: >99.5% (reliability standard)\n`;
    benchmarks += `• Response Time: <3 seconds (performance standard)\n`;
    benchmarks += `• Security Compliance: SOC 2 Type II (security standard)\n\n`;
    
    // Market-Specific Benchmarks (Rwanda/East Africa)
    benchmarks += `**Rwanda/East Africa Market Context:**\n`;
    benchmarks += `• Mobile Money Adoption: >90% (payment method)\n`;
    benchmarks += `• Internet Penetration: >70% (digital access)\n`;
    benchmarks += `• Urban Population: >30% (target market size)\n`;
    benchmarks += `• Average Income: $500-2000/month (pricing context)\n`;
    
    return benchmarks;
  };
  
  // Helper function to generate scenario analysis from BMC data
  const generateScenariosFromBMC = (bmc: any) => {
    const segments = bmc.customerSegments || '';
    const revenueStreams = bmc.revenueStreams || '';
    const valueProp = bmc.valueProposition || '';
    const partnerships = bmc.keyPartnerships || '';
    
    let bestCase = `Best-Case Scenario Assumptions:\n\n`;
    let worstCase = `Worst-Case Scenario Assumptions:\n\n`;
    let riskMitigation = `Key Risk Mitigation Strategies:\n\n`;
    
    // Best Case Scenario
    bestCase += `**Market Conditions:**\n`;
    bestCase += `• Rapid adoption of e-mobility in Rwanda (50%+ market penetration)\n`;
    bestCase += `• Strong government support and incentives for clean transportation\n`;
    bestCase += `• High investor confidence in sustainable transportation sector\n`;
    bestCase += `• Favorable regulatory environment for ride-sharing platforms\n\n`;
    
    bestCase += `**Business Performance:**\n`;
    bestCase += `• Exceed target driver acquisition by 150%\n`;
    bestCase += `• Achieve 80%+ vehicle utilization rates\n`;
    bestCase += `• Secure $1M+ in investment funding within 12 months\n`;
    bestCase += `• Expand to 2 additional cities in East Africa\n\n`;
    
    bestCase += `**Financial Performance:**\n`;
    bestCase += `• Reach profitability within 18 months\n`;
    bestCase += `• Achieve 200%+ revenue growth year-over-year\n`;
    bestCase += `• Maintain <15% customer acquisition cost\n`;
    bestCase += `• Generate 20%+ ROI for investors\n\n`;
    
    // Worst Case Scenario
    worstCase += `**Market Challenges:**\n`;
    worstCase += `• Slow adoption of e-mobility (market resistance)\n`;
    worstCase += `• Regulatory restrictions on ride-sharing platforms\n`;
    worstCase += `• Economic downturn affecting disposable income\n`;
    worstCase += `• Increased competition from established players\n\n`;
    
    worstCase += `**Operational Challenges:**\n`;
    worstCase += `• High driver churn rate (>30% annually)\n`;
    worstCase += `• Vehicle maintenance costs exceed projections\n`;
    worstCase += `• Technology platform issues affecting user experience\n`;
    worstCase += `• Difficulty securing follow-up funding\n\n`;
    
    worstCase += `**Financial Challenges:**\n`;
    worstCase += `• Customer acquisition costs exceed $200\n`;
    worstCase += `• Revenue growth below 50% annually\n`;
    worstCase += `• Extended time to profitability (36+ months)\n`;
    worstCase += `• Investor returns below 5% annually\n\n`;
    
    // Risk Mitigation Strategies
    riskMitigation += `**Market Risk Mitigation:**\n`;
    riskMitigation += `• Diversify revenue streams (multiple customer segments)\n`;
    riskMitigation += `• Build strong government relationships and compliance\n`;
    riskMitigation += `• Develop competitive pricing strategies\n`;
    riskMitigation += `• Create unique value propositions beyond price\n\n`;
    
    riskMitigation += `**Operational Risk Mitigation:**\n`;
    riskMitigation += `• Implement robust driver retention programs\n`;
    riskMitigation += `• Establish preventive maintenance protocols\n`;
    riskMitigation += `• Invest in scalable technology infrastructure\n`;
    riskMitigation += `• Build strong partnerships and strategic alliances\n\n`;
    
    riskMitigation += `**Financial Risk Mitigation:**\n`;
    riskMitigation += `• Maintain 18+ months of runway at all times\n`;
    riskMitigation += `• Implement cost control and monitoring systems\n`;
    riskMitigation += `• Diversify funding sources (grants, loans, equity)\n`;
    riskMitigation += `• Regular financial reporting and investor communication\n\n`;
    
    riskMitigation += `**Technology Risk Mitigation:**\n`;
    riskMitigation += `• Implement comprehensive testing and QA processes\n`;
    riskMitigation += `• Build redundant systems and backup protocols\n`;
    riskMitigation += `• Invest in cybersecurity and data protection\n`;
    riskMitigation += `• Maintain technical team expertise and training\n`;
    
    return {
      bestCase,
      worstCase,
      riskMitigation
    };
  };

  // Intelligent calculation functions
  const inferCOGSFromAnalysis = (answers: Record<string, string>, existingAnalysis?: any) => {
    // First, try to infer from existing analysis if available
    if (existingAnalysis && existingAnalysis.cogs) {
      // Extract COGS value from existing analysis
      const cogsMatch = existingAnalysis.cogs.match(/\$(\d+(?:\.\d+)?)/);
      if (cogsMatch) {
        return parseFloat(cogsMatch[1]);
      }
    }
    
    // If user has provided product_costs, try to extract cost information
    const productCosts = answers.product_costs || '';
    if (productCosts) {
      // Look for cost patterns in the text
      const costMatches = productCosts.match(/\$(\d+(?:\.\d+)?)/g);
      if (costMatches && costMatches.length > 0) {
        // Sum up all mentioned costs
        const totalCosts = costMatches.reduce((sum, match) => {
          const value = parseFloat(match.replace('$', ''));
          return sum + value;
        }, 0);
        return totalCosts > 0 ? totalCosts : null;
      }
    }
    
    // If user has provided a specific COGS value
    if (answers.cogs_per_month) {
      return parseFloat(answers.cogs_per_month);
    }
    
    return null; // No inference possible
  };

  const calculateBreakevenCustomers = (answers: Record<string, string>, existingAnalysis?: any) => {
    const monthlyBurn = parseFloat(answers.monthly_burn || '0');
    const estimatedCOGS = inferCOGSFromAnalysis(answers, existingAnalysis);
    const pricingStrategy = answers.pricing_strategy || '';
    
    // Extract average revenue per customer from pricing strategy
    let avgRevenuePerCustomer = 50; // Default estimate
    
    if (pricingStrategy.includes('$')) {
      // Try to extract price from pricing strategy text
      const priceMatch = pricingStrategy.match(/\$(\d+)/);
      if (priceMatch) {
        avgRevenuePerCustomer = parseFloat(priceMatch[1]);
      }
    }
    
    if (monthlyBurn > 0 && estimatedCOGS && avgRevenuePerCustomer > estimatedCOGS) {
      const contributionMargin = avgRevenuePerCustomer - estimatedCOGS;
      return Math.ceil(monthlyBurn / contributionMargin);
    }
    
    return 0;
  };

  const loadSavedAnalysis = async () => {
    try {
      console.log('🔄 Loading saved financial analysis...');
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      if (response.ok) {
        const responseData = await response.json();
        console.log('📊 Saved analyses response:', responseData);
        
        const analyses = responseData.analyses || {};
        
        if (analyses.financial) {
          console.log('✅ Found saved financial analysis:', analyses.financial);
          setSavedAnalysis(analyses.financial);
          setHasSavedAnalysis(true);
        } else {
          console.log('⚠️ No saved financial analysis found');
          setHasSavedAnalysis(false);
        }
      } else {
        console.error('❌ Failed to load saved analyses:', response.status);
        setHasSavedAnalysis(false);
      }
    } catch (error) {
      console.error('❌ Error loading saved analysis:', error);
      setHasSavedAnalysis(false);
    }
  };

  const loadBMCData = async () => {
    try {
      console.log('🔄 Loading BMC data for financial analysis...');
      // Load BMC analysis to pre-populate financial questions
      const bmcResponse = await fetch(`/api/projects/${projectId}/analyses`);
      if (bmcResponse.ok) {
        const responseData = await bmcResponse.json();
        console.log('📊 BMC API response:', responseData);
        
        // The API returns { analyses: { bmc: {...}, technical: {...} } }
        const analyses = responseData.analyses || {};
        
        if (analyses.bmc && analyses.bmc.businessModelCanvas) {
          const bmc = analyses.bmc.businessModelCanvas;
          console.log('🎯 Found BMC data:', bmc);
          
          // Pre-populate answers from BMC data
          const prePopulatedAnswers: Record<string, any> = {};
          
          // Customer segments from BMC
          if (bmc.customerSegments) {
            prePopulatedAnswers.target_customers = bmc.customerSegments;
            console.log('✅ Mapped customer segments:', bmc.customerSegments);
          }
          
          // Revenue streams from BMC - use for both revenue model and pricing strategy
          if (bmc.revenueStreams) {
            // Convert revenue streams to array format for multiselect
            const revenueStreamsText = bmc.revenueStreams;
            const revenueModels: string[] = [];
            
            // Map common revenue model keywords to our predefined options
            const modelMappings = {
              'subscription': 'Subscription/SaaS',
              'saas': 'Subscription/SaaS',
              'recurring': 'Subscription/SaaS',
              'one-time': 'One-time Purchase',
              'purchase': 'One-time Purchase',
              'freemium': 'Freemium',
              'commission': 'Marketplace Commission',
              'marketplace': 'Marketplace Commission',
              'advertising': 'Advertising',
              'ads': 'Advertising',
              'licensing': 'Licensing',
              'license': 'Licensing'
            };
            
            // Check for matches in the revenue streams text
            Object.entries(modelMappings).forEach(([keyword, model]) => {
              if (revenueStreamsText.toLowerCase().includes(keyword)) {
                if (!revenueModels.includes(model)) {
                  revenueModels.push(model);
                }
              }
            });
            
            // If no matches found, use the text as-is or default to "Other"
            if (revenueModels.length === 0) {
              revenueModels.push('Other');
            }
            
            prePopulatedAnswers.revenue_model = revenueModels;
            console.log('✅ Mapped revenue streams to models:', revenueModels);
            
            // Use revenue streams for pricing strategy
            // Parse revenue streams to extract pricing information
            let pricingInfo = '';
            
            // Create structured pricing strategy based on customer segments and revenue streams
            const segments = bmc.customerSegments || '';
            const valueProp = bmc.valueProposition || '';
            
            pricingInfo = `Pricing Strategy by Customer Segment:\n\n`;
            
            // Extract pricing information from revenue streams if available
            const hasExplicitPricing = revenueStreamsText.includes('$') || 
                                     revenueStreamsText.includes('USD') || 
                                     revenueStreamsText.includes('RWF') ||
                                     revenueStreamsText.includes('fee') ||
                                     revenueStreamsText.includes('commission') ||
                                     revenueStreamsText.includes('rental');
            
            if (hasExplicitPricing) {
              pricingInfo += `**Current Revenue Streams & Pricing:**\n${revenueStreamsText}\n\n`;
            }
            
            // Create segment-specific pricing frameworks
            if (segments.includes('Investors') || segments.includes('investor')) {
              pricingInfo += `**For Investors:**\n`;
              pricingInfo += `• Investment minimum: [To be determined - consider local market rates]\n`;
              pricingInfo += `• Expected ROI: [To be determined - benchmark against similar investments]\n`;
              pricingInfo += `• Management fee: [To be determined - typically 1-3% annually]\n`;
              pricingInfo += `• Dividend distribution: [To be determined - monthly/quarterly]\n\n`;
            }
            
            if (segments.includes('Drivers') || segments.includes('Moto-Taxi') || segments.includes('driver')) {
              pricingInfo += `**For Drivers:**\n`;
              pricingInfo += `• Daily rental fee: [To be determined - competitive with traditional moto-taxis]\n`;
              pricingInfo += `• Commission per ride: [To be determined - typically 10-20%]\n`;
              pricingInfo += `• Insurance coverage: [To be determined - liability and vehicle insurance]\n`;
              pricingInfo += `• Maintenance support: [To be determined - included or additional fee]\n\n`;
            }
            
            if (segments.includes('Cooperative') || segments.includes('cooperative')) {
              pricingInfo += `**For Cooperative:**\n`;
              pricingInfo += `• Membership fee: [To be determined - one-time or annual]\n`;
              pricingInfo += `• Service fees: [To be determined - platform usage fees]\n`;
              pricingInfo += `• Training costs: [To be determined - driver onboarding]\n\n`;
            }
            
            // Add revenue streams context
            pricingInfo += `**Revenue Streams Context:**\n${revenueStreamsText}\n\n`;
            
            // Add value proposition for pricing context
            if (valueProp) {
              pricingInfo += `**Value Proposition Context (for pricing justification):**\n${valueProp}`;
            }
            
            prePopulatedAnswers.pricing_strategy = pricingInfo;
            console.log('✅ Mapped pricing strategy:', pricingInfo);
          } else if (bmc.valueProposition) {
            // Fallback to value proposition if no revenue streams
            prePopulatedAnswers.pricing_strategy = `Value Proposition (Pricing to be determined):\n${bmc.valueProposition}`;
            console.log('✅ Mapped value proposition as fallback:', bmc.valueProposition);
          }
          
          // Key partnerships from BMC
          if (bmc.keyPartnerships) {
            prePopulatedAnswers.customer_acquisition = `Key partnerships: ${bmc.keyPartnerships}`;
            console.log('✅ Mapped key partnerships:', bmc.keyPartnerships);
          }
          
          // Cost structure from BMC
          if (bmc.costStructure) {
            prePopulatedAnswers.infrastructure_costs = `Cost structure: ${bmc.costStructure}`;
            console.log('✅ Mapped cost structure:', bmc.costStructure);
          }
          
          // Additional mappings for more comprehensive coverage
          if (bmc.channels) {
            prePopulatedAnswers.customer_acquisition = `${prePopulatedAnswers.customer_acquisition || ''}\n\nDistribution channels: ${bmc.channels}`.trim();
            console.log('✅ Mapped channels:', bmc.channels);
          }
          
          if (bmc.keyActivities) {
            prePopulatedAnswers.team_structure = `Key activities: ${bmc.keyActivities}`;
            console.log('✅ Mapped key activities:', bmc.keyActivities);
          }
          
          if (bmc.keyResources) {
            prePopulatedAnswers.infrastructure_costs = `${prePopulatedAnswers.infrastructure_costs || ''}\n\nKey resources: ${bmc.keyResources}`.trim();
            console.log('✅ Mapped key resources:', bmc.keyResources);
          }
          
          if (bmc.customerRelationships) {
            prePopulatedAnswers.customer_acquisition = `${prePopulatedAnswers.customer_acquisition || ''}\n\nCustomer relationships: ${bmc.customerRelationships}`.trim();
            console.log('✅ Mapped customer relationships:', bmc.customerRelationships);
          }
          
          // Generate product/service costs based on BMC data
          const productCosts = generateProductCostsFromBMC(bmc);
          if (productCosts) {
            prePopulatedAnswers.product_costs = productCosts;
            console.log('✅ Generated product costs from BMC:', productCosts);
          }
          
          // Generate funding plans based on BMC data
          const fundingPlans = generateFundingPlansFromBMC(bmc);
          if (fundingPlans) {
            prePopulatedAnswers.funding_plans = fundingPlans;
            console.log('✅ Generated funding plans from BMC:', fundingPlans);
          }
          
          // Generate KPIs based on BMC data and business model
          const kpis = generateKPIsFromBMC(bmc);
          if (kpis) {
            prePopulatedAnswers.key_metrics = kpis;
            console.log('✅ Generated KPIs from BMC:', kpis);
          }
          
          // Generate industry benchmarks based on business model
          const benchmarks = generateBenchmarksFromBMC(bmc);
          if (benchmarks) {
            prePopulatedAnswers.benchmark_metrics = benchmarks;
            console.log('✅ Generated benchmarks from BMC:', benchmarks);
          }
          
          // Generate scenario analysis based on BMC data
          const scenarios = generateScenariosFromBMC(bmc);
          if (scenarios) {
            prePopulatedAnswers.best_case = scenarios.bestCase;
            prePopulatedAnswers.worst_case = scenarios.worstCase;
            prePopulatedAnswers.risk_mitigation = scenarios.riskMitigation;
            console.log('✅ Generated scenarios from BMC:', scenarios);
          }
          
          console.log('🎯 Final pre-populated answers:', prePopulatedAnswers);
          setAnswers(prePopulatedAnswers);
          setBmcDataLoaded(true);
        } else {
          console.log('⚠️ No BMC data found or BMC not completed yet');
          setBmcDataLoaded(false);
        }
      } else {
        console.error('❌ Failed to load BMC data:', bmcResponse.status);
      }
    } catch (error) {
      console.error('❌ Error loading BMC data:', error);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const getCurrentStepQuestions = () => {
    return questions.filter(q => q.step === currentStep);
  };

  const canProceedToNextStep = () => {
    // Always allow proceeding for debugging
    return true;
    
    // Original validation (commented out for debugging)
    // const currentQuestions = getCurrentStepQuestions();
    // return currentQuestions.every(q => !q.required || answers[q.id]);
  };

  const generateFinancialModel = async () => {
    try {
      setIsAnalyzing(true);
      
      // Infer values from existing analysis or user inputs
      const inferredCOGS = inferCOGSFromAnalysis(answers, financialData);
      const calculatedBreakevenCustomers = calculateBreakevenCustomers(answers, financialData);
      
      // Add inferred values to answers
      const enhancedAnswers = {
        ...answers,
        ...(inferredCOGS && { inferred_cogs_per_month: inferredCOGS.toString() }),
        ...(calculatedBreakevenCustomers > 0 && { calculated_breakeven_customers: calculatedBreakevenCustomers.toString() })
      };
      
      const response = await fetch(`/api/projects/${projectId}/financial/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          context,
          answers: enhancedAnswers,
          step: currentStep
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFinancialData(data);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error generating financial model:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to get tooltip content for each question
  const getTooltipContent = (questionId: string) => {
    const tooltips: Record<string, string> = {
      // Step 1: Revenue Projections
      'revenue_model': 'Your ways of generating income. You can select multiple revenue models if your business uses different approaches. Common models include subscription (SaaS), one-time purchase, freemium, marketplace commission, advertising, licensing, or other models.',
      'target_customers': 'Specific groups of people or organizations who will use your product/service. Be detailed about demographics, needs, and characteristics.',
      'pricing_strategy': 'How you plan to price your product/service for different customer segments. Include pricing tiers, expected price points, and value-based pricing rationale.',
      'revenue_timeline': 'When you expect to start generating actual revenue from customers. This helps plan cash flow and funding needs.',
      
      // Step 2: Key Factors Influencing Revenue
      'customer_acquisition': 'Specific methods and channels you\'ll use to attract new customers. Include marketing strategies, partnerships, and acquisition channels.',
      'estimated_cac': 'Total cost to acquire one new customer, including marketing, sales, and onboarding expenses. Industry average is $50-200.',
      'expected_churn': 'Percentage of customers who stop using your service each month. Lower is better - aim for <5% monthly churn.',
      'customer_lifetime': 'Average number of months a customer stays with your service. Higher lifetime value means more revenue per customer.',
      
      // Step 3: Cost of Revenues / COGS
      'product_costs': 'Main cost components for delivering your product/service. Include hosting, payment processing, third-party services, materials, and operational costs. Use "per month" units for all costs.',
      'cogs_per_month': 'Your estimated monthly Cost of Goods Sold. This will be inferred from your cost descriptions if not provided directly.',
      'scaling_costs': 'How your costs change as you grow. Linear scaling means costs increase proportionally, while economies of scale mean lower per-unit costs.',
      
      // Step 4: Operating Expenses
      'team_structure': 'Current and planned team members, their roles, salaries, and hiring timeline. This affects your monthly burn rate.',
      'monthly_burn': 'Total monthly expenses including salaries, infrastructure, marketing, and other operational costs.',
      'infrastructure_costs': 'Costs for hosting, tools, office space, legal, marketing, and other business operations.',
      
      // Step 5: Income Statement Construction
      'revenue_growth': 'Expected monthly percentage increase in revenue. Start conservatively (10-20%) and adjust based on market conditions.',
      'profit_margins': 'Gross profit margin percentage. Aim for 60-80% for software businesses, 20-40% for physical products.',
      
      // Step 6: Cash Flow and Balance Sheet Analysis
      'current_cash': 'Total cash available in your business accounts right now. This determines your runway.',
      'funding_plans': 'Detailed plan for raising capital including funding rounds, amounts, timeline, and investor types.',
      
      // Step 7: KPIs
      'key_metrics': 'Most important numbers to track your business performance. Focus on 5-10 key metrics that drive your business.',
      'benchmark_metrics': 'Industry standards and benchmarks you want to meet or exceed. Helps set realistic targets.',
      
      // Step 8: Breakeven Analysis
      'breakeven_timeline': 'When you expect revenue to equal expenses. This is when you become profitable.',
      
      // Step 9: Scenario Analysis
      'best_case': 'Optimistic assumptions about market conditions, growth, and business performance.',
      'worst_case': 'Pessimistic assumptions about challenges, competition, and potential problems.',
      'risk_mitigation': 'Specific strategies to reduce or manage the risks identified in your worst-case scenario.'
    };
    
    return tooltips[questionId] || 'This field helps analyze your financial model and business performance.';
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'textarea':
        return (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="min-h-[100px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAnswerChange(question.id, "I don't know yet")}
              className="text-gray-500"
            >
              I don't know yet
            </Button>
          </div>
        );
      case 'number':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, parseFloat(e.target.value) || 0)}
              placeholder={question.placeholder}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAnswerChange(question.id, "I don't know yet")}
              className="text-gray-500"
            >
              I don't know yet
            </Button>
          </div>
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              <SelectItem value="I don't know yet">
                I don't know yet
              </SelectItem>
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {question.options?.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option]
                        : selectedValues.filter(v => v !== option);
                      handleAnswerChange(question.id, newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAnswerChange(question.id, ["I don't know yet"])}
              className="text-gray-500"
            >
              I don't know yet
            </Button>
            {selectedValues.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedValues.join(', ')}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <Input
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAnswerChange(question.id, "I don't know yet")}
              className="text-gray-500"
            >
              I don't know yet
            </Button>
          </div>
        );
    }
  };

  const renderFinancialResults = () => {
    if (!financialData) return null;

    return (
      <div className="space-y-6">
        {FINRO_STEPS.map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                  {step.id}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-4">{step.description}</div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-800">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-gray-700">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                  }}
                >
                  {getStepContent(step.id)}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const getStepContent = (stepId: number) => {
    if (!financialData) return 'No data available';
    
    switch (stepId) {
      case 1: return financialData.revenueProjections || 'Revenue projections not available';
      case 2: return financialData.keyFactors || 'Key factors not available';
      case 3: return financialData.cogs || 'COGS analysis not available';
      case 4: return financialData.operatingExpenses || 'Operating expenses not available';
      case 5: return financialData.incomeStatement || 'Income statement not available';
      case 6: return financialData.cashFlow || 'Cash flow analysis not available';
      case 7: return financialData.kpis || 'KPIs not available';
      case 8: return financialData.breakeven || 'Breakeven analysis not available';
      case 9: return financialData.scenarios || 'Scenario analysis not available';
      default: return 'Content not available';
    }
  };

  const handleImproveAnalysis = async () => {
    if (!improveDetails?.trim()) {
      setError('Please provide details on how to improve the analysis');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!financialData) {
      setError('No analysis found to improve');
      return;
    }

    try {
      setIsImproving(true);
      setError(null);

      // Convert financial data to string format for improvement
      const originalAnalysis = JSON.stringify(financialData, null, 2);

      const response = await fetch(`/api/projects/${projectId}/improve-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'financial',
          originalAnalysis,
          improvementDetails: improveDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve analysis');
      }

      const result = await response.json();
      
      // Try to parse the improved analysis back to the expected format
      let improvedAnalysisData;
      try {
        improvedAnalysisData = JSON.parse(result.improvedAnalysis);
      } catch {
        // If parsing fails, create a new analysis object with the improved content
        improvedAnalysisData = {
          ...financialData,
          summary: result.improvedAnalysis,
          timestamp: new Date().toISOString()
        };
      }

      // Update the financial data with the improved version
      setFinancialData(improvedAnalysisData);

      // Clear the improvement details and close dialog
      setImproveDetails('');
      setShowImproveDialog(false);

      setSuccessMessage('Financial analysis improved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('Financial analysis improvement error:', error);
      setError(error.message || 'Failed to improve analysis');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!financialData) {
      setError('No analysis to save');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'financial',
          analysisData: financialData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save analysis');
      }

      setSuccessMessage('Financial analysis saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload saved analysis to update the state
      await loadSavedAnalysis();

    } catch (error: any) {
      console.error('Save analysis error:', error);
      setError(error.message || 'Failed to save analysis');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSavedAnalysis = () => {
    if (savedAnalysis) {
      setFinancialData(savedAnalysis);
      setShowResults(true);
    }
  };

  const renderCalculatedValues = () => {
    if (Object.keys(answers).length === 0) return null;

    const inferredCOGS = inferCOGSFromAnalysis(answers, financialData);
    const calculatedBreakevenCustomers = calculateBreakevenCustomers(answers, financialData);

    return (
      <Card className="mb-4 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Calculated Values
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inferredCOGS ? (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Estimated COGS:</span>
              <span className="text-sm font-bold text-blue-700">${inferredCOGS}/month</span>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              COGS will be calculated based on your cost inputs and market analysis
            </div>
          )}
          {calculatedBreakevenCustomers > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Breakeven customers needed:</span>
              <span className="text-sm font-bold text-blue-700">{calculatedBreakevenCustomers.toLocaleString()}</span>
            </div>
          )}
          <div className="text-xs text-blue-600 mt-2">
            * Values inferred from your inputs and existing analysis
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showResults && financialData) {
    return (
      <div className="space-y-6">
        {/* Error and Success Messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center">
            <Calculator className="w-6 h-6 mr-2" />
            Financial Analysis Results
          </h2>
          <div className="flex items-center gap-2">
            {/* Improve Analysis Button */}
            <Dialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!isOwned}
                  className="flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Improve Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Improve Financial Analysis
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="improve-details">How would you like to improve this analysis?</Label>
                    <Textarea
                      id="improve-details"
                      placeholder="Describe what aspects of the financial analysis you'd like to improve, add, or modify..."
                      value={improveDetails}
                      onChange={(e) => setImproveDetails(e.target.value)}
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImproveDialog(false);
                        setImproveDetails('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImproveAnalysis}
                      disabled={isImproving || !improveDetails.trim()}
                      className="flex items-center"
                    >
                      {isImproving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Improving...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Improve Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Save Analysis Button */}
            <Button 
              variant="outline" 
              size="sm"
              disabled={!isOwned || isSaving}
              onClick={handleSaveAnalysis}
              className="flex items-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Analysis
                </>
              )}
            </Button>

            {/* Back to Questions Button */}
            <Button 
              variant="outline" 
              onClick={() => setShowResults(false)}
            >
              Back to Questions
            </Button>
            
            {/* Start New Analysis Button */}
            <Button 
              variant="outline" 
              onClick={() => {
                setShowResults(false);
                setFinancialData(null);
                setAnswers({});
                setCurrentStep(1);
              }}
              className="flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              Start New Analysis
            </Button>
          </div>
        </div>
        {renderFinancialResults()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Calculator className="w-6 h-6 mr-2" />
          Financial Analysis - FINRO Process
        </h2>
        <div className="flex items-center gap-2">
          {hasSavedAnalysis && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewSavedAnalysis}
              className="flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Saved Analysis
            </Button>
          )}
          {isGeneratingQuestions && (
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Questions...
            </Badge>
          )}
        </div>
      </div>

      {/* BMC Integration Notice */}
      <Alert className={bmcDataLoaded ? "border-green-200 bg-green-50" : ""}>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          {bmcDataLoaded ? (
            <>
              <div className="flex items-center mb-2">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <strong className="text-green-800">BMC Data Successfully Loaded!</strong>
              </div>
              <p className="text-green-700 mb-2">
                Your Business Model Canvas data has been automatically mapped to pre-populate relevant financial questions below.
              </p>
              <strong className="text-green-800">BMC Data Integration:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-green-700">
                <li><strong>Customer Segments</strong> → Target customer questions</li>
                <li><strong>Revenue Streams</strong> → Revenue model questions</li>
                <li><strong>Cost Structure + Key Resources</strong> → Product/service costs per month</li>
                <li><strong>Revenue Streams + Customer Segments</strong> → Structured pricing strategy by segment</li>
                <li><strong>Channels</strong> → Distribution cost questions</li>
                <li><strong>Key Activities</strong> → Team structure questions</li>
                <li><strong>Key Resources</strong> → Infrastructure cost questions</li>
                <li><strong>Value Proposition + Partnerships</strong> → Funding plans and timeline</li>
                <li><strong>BMC Data Analysis</strong> → KPIs, benchmarks, and scenario analysis</li>
              </ul>
            </>
          ) : (
            <>
              <strong>Tip:</strong> This financial analysis will be enhanced with data from your Business Model Canvas.
              <br /><br />
              <strong>BMC Data Integration:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li><strong>Customer Segments</strong> → Target customer questions</li>
                <li><strong>Revenue Streams</strong> → Revenue model questions</li>
                <li><strong>Cost Structure + Key Resources</strong> → Product/service costs per month</li>
                <li><strong>Revenue Streams + Customer Segments</strong> → Structured pricing strategy by segment</li>
                <li><strong>Channels</strong> → Distribution cost questions</li>
                <li><strong>Value Proposition + Partnerships</strong> → Funding plans and timeline</li>
                <li><strong>BMC Data Analysis</strong> → KPIs, benchmarks, and scenario analysis</li>
              </ul>
              If you haven't completed the BMC analysis yet, some questions may be pre-populated with "I don't know yet"
              to help you explore and identify areas that need more research.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Saved Analysis Notice */}
      {hasSavedAnalysis && (
        <Alert className="border-blue-200 bg-blue-50">
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                  <strong className="text-blue-800">Saved Financial Analysis Available!</strong>
                </div>
                <p className="text-blue-700">
                  You have a previously saved financial analysis. Click "View Saved Analysis" above to review it, or continue with a new analysis below.
                  {savedAnalysis?.timestamp && (
                    <span className="block text-sm text-blue-600 mt-1">
                      Last saved: {new Date(savedAnalysis.timestamp).toLocaleDateString()} at {new Date(savedAnalysis.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="font-semibold">Progress</h3>
              <Tooltip content={
                <div className="max-w-md">
                  <p className="text-sm font-medium mb-2">FINRO Financial Analysis Process</p>
                  <p className="text-sm">This 9-step process helps you build a comprehensive financial model:</p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>• Steps 1-2: Revenue projections and key factors</li>
                    <li>• Steps 3-4: Cost analysis and operating expenses</li>
                    <li>• Steps 5-6: Income statements and cash flow</li>
                    <li>• Steps 7-9: KPIs, breakeven, and scenario analysis</li>
                  </ul>
                </div>
              }>
                <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </Tooltip>
            </div>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {FINRO_STEPS.length}
            </span>
          </div>
          <div className="flex space-x-2">
            {FINRO_STEPS.map((step) => (
              <Tooltip key={step.id} content={
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-gray-300">{step.description}</p>
                </div>
              }>
                <div
                  className={`flex-1 h-2 rounded-full cursor-help ${
                    step.id <= currentStep 
                      ? 'bg-blue-500' 
                      : 'bg-gray-200'
                  }`}
                />
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              {currentStep}
            </span>
            <span className="flex-1">{FINRO_STEPS[currentStep - 1]?.title}</span>
            <Tooltip content={
              <div className="max-w-md">
                <p className="text-sm font-medium mb-2">{FINRO_STEPS[currentStep - 1]?.title}</p>
                <p className="text-sm">{FINRO_STEPS[currentStep - 1]?.description}</p>
                <p className="text-xs text-gray-300 mt-2">
                  This step helps you analyze {FINRO_STEPS[currentStep - 1]?.title.toLowerCase()} to build a comprehensive financial model.
                </p>
              </div>
            }>
              <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
            </Tooltip>
          </CardTitle>
          <p className="text-sm text-gray-600">
            {FINRO_STEPS[currentStep - 1]?.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show calculated values for relevant steps */}
          {(currentStep === 3 || currentStep === 8) && renderCalculatedValues()}
          
          {getCurrentStepQuestions().map((question) => (
            <div key={question.id} className="space-y-2">
              <Label className="flex items-center">
                <span className="flex-1">{question.question}</span>
                {question.required && <span className="text-red-500 ml-1">*</span>}
                <Tooltip content={<p className="text-sm max-w-xs">{getTooltipContent(question.id)}</p>}>
                  <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
                </Tooltip>
              </Label>
              {renderQuestion(question)}
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep < FINRO_STEPS.length ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNextStep()}
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={generateFinancialModel}
                disabled={!canProceedToNextStep() || isAnalyzing}
                className="flex items-center"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Model...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Financial Model
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context Preview */}
      {context && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Project Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {context.substring(0, 500)}...
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
