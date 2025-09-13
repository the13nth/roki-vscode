export const INDUSTRY_OPTIONS = [
  { value: 'fintech', label: 'Financial Technology', icon: '💰', description: 'Banking, payments, lending, insurance' },
  { value: 'healthtech', label: 'Healthcare Technology', icon: '🏥', description: 'Telemedicine, health records, medical devices' },
  { value: 'edtech', label: 'Educational Technology', icon: '🎓', description: 'Online learning, educational tools, student management' },
  { value: 'ecommerce', label: 'E-commerce & Retail', icon: '🛒', description: 'Online stores, marketplace, retail technology' },
  { value: 'saas', label: 'Software as a Service', icon: '💻', description: 'Cloud software, productivity tools, business apps' },
  { value: 'marketplace', label: 'Marketplace & Platform', icon: '🏪', description: 'Two-sided markets, platform economy, gig economy' },
  { value: 'social', label: 'Social & Community', icon: '👥', description: 'Social networks, community platforms, messaging' },
  { value: 'iot', label: 'IoT & Hardware', icon: '🔌', description: 'Connected devices, smart hardware, sensors' },
  { value: 'ai-ml', label: 'AI & Machine Learning', icon: '🤖', description: 'Artificial intelligence, ML models, automation' },
  { value: 'blockchain', label: 'Blockchain & Web3', icon: '⛓️', description: 'Cryptocurrency, DeFi, NFTs, decentralized apps' },
  { value: 'gaming', label: 'Gaming & Entertainment', icon: '🎮', description: 'Video games, esports, entertainment platforms' },
  { value: 'productivity', label: 'Productivity & Tools', icon: '⚡', description: 'Workflow tools, project management, collaboration' },
  { value: 'logistics', label: 'Logistics & Supply Chain', icon: '📦', description: 'Shipping, warehousing, supply chain management' },
  { value: 'ev', label: 'Electric Vehicles', icon: '🚗', description: 'EV manufacturing, charging infrastructure, battery tech' },
  { value: 'mobility', label: 'Mobility & Transportation', icon: '🚌', description: 'Ride-sharing, public transit, smart transportation' },
  { value: 'other', label: 'Other', icon: '📋', description: 'Custom or emerging industry' }
];

export const BUSINESS_MODEL_OPTIONS = [
  { value: 'b2b-saas', label: 'B2B SaaS', description: 'Subscription software for businesses' },
  { value: 'b2c-saas', label: 'B2C SaaS', description: 'Subscription software for consumers' },
  { value: 'marketplace', label: 'Marketplace', description: 'Commission-based platform connecting buyers and sellers' },
  { value: 'transaction', label: 'Transaction', description: 'Fee-based transaction processing' },
  { value: 'advertising', label: 'Advertising', description: 'Ad-supported free service' },
  { value: 'freemium', label: 'Freemium', description: 'Free basic service with premium upgrades' },
  { value: 'consulting', label: 'Consulting', description: 'Professional services and expertise' },
  { value: 'licensing', label: 'Licensing', description: 'License technology or intellectual property' },
  { value: 'hardware', label: 'Hardware Sales', description: 'Physical product sales' },
  { value: 'data', label: 'Data Monetization', description: 'Sell insights and analytics' },
  { value: 'other', label: 'Other', description: 'Custom business model' },
  { value: 'unknown', label: "I don't know", description: 'Let AI analyze and suggest the best business models' }
];

export const getIndustryTemplates = (industry: string) => {
  const industrySpecific: Record<string, Array<{ id: string; name: string; description: string; icon: string; features: string[]; requirements: string[]; }>> = {
    fintech: [
      {
        id: 'fintech-payment',
        name: 'Payment Platform',
        description: 'Build a comprehensive payment processing platform',
        icon: '💳',
        features: ['Payment processing', 'Multi-currency support', 'Fraud detection', 'API integration', 'Analytics dashboard'],
        requirements: ['PCI DSS compliance', 'Banking partnerships', 'Security expertise', 'Regulatory knowledge']
      },
      {
        id: 'fintech-lending',
        name: 'Digital Lending',
        description: 'Create an AI-powered lending platform',
        icon: '🏦',
        features: ['Credit scoring', 'Loan origination', 'Risk assessment', 'Automated underwriting', 'Portfolio management'],
        requirements: ['Credit risk expertise', 'Regulatory compliance', 'Data analytics', 'Banking licenses']
      }
    ],
    healthtech: [
      {
        id: 'healthtech-telemedicine',
        name: 'Telemedicine Platform',
        description: 'Build a comprehensive telemedicine solution',
        icon: '🩺',
        features: ['Video consultations', 'Patient records', 'Prescription management', 'Appointment scheduling', 'Insurance integration'],
        requirements: ['HIPAA compliance', 'Medical licenses', 'Healthcare expertise', 'Integration capabilities']
      },
      {
        id: 'healthtech-wearables',
        name: 'Health Monitoring',
        description: 'Create a health monitoring and analytics platform',
        icon: '⌚',
        features: ['Health tracking', 'Data analytics', 'Alert systems', 'Provider integration', 'Patient engagement'],
        requirements: ['Medical device certification', 'Data privacy expertise', 'Healthcare partnerships', 'Analytics capabilities']
      }
    ],
    logistics: [
      {
        id: 'logistics-tracking',
        name: 'Supply Chain Tracking',
        description: 'Build a comprehensive supply chain visibility platform',
        icon: '📦',
        features: ['Real-time tracking', 'Inventory management', 'Route optimization', 'Supplier integration', 'Analytics dashboard'],
        requirements: ['Logistics expertise', 'IoT integration', 'Data analytics', 'Industry partnerships']
      },
      {
        id: 'logistics-optimization',
        name: 'Logistics Optimization',
        description: 'Create an AI-powered logistics optimization platform',
        icon: '🚛',
        features: ['Route optimization', 'Load planning', 'Cost optimization', 'Performance analytics', 'Integration APIs'],
        requirements: ['Operations research', 'AI/ML expertise', 'Transportation knowledge', 'Data science capabilities']
      }
    ],
    ev: [
      {
        id: 'ev-charging',
        name: 'EV Charging Network',
        description: 'Build a comprehensive EV charging infrastructure platform',
        icon: '🔌',
        features: ['Charging station management', 'Payment processing', 'Route planning', 'Energy management', 'User app'],
        requirements: ['Energy expertise', 'Infrastructure knowledge', 'Payment systems', 'Mobile app development']
      },
      {
        id: 'ev-fleet',
        name: 'EV Fleet Management',
        description: 'Create an EV fleet management and optimization platform',
        icon: '🚗',
        features: ['Fleet monitoring', 'Battery management', 'Route optimization', 'Maintenance scheduling', 'Cost analytics'],
        requirements: ['Fleet management expertise', 'EV technology knowledge', 'IoT integration', 'Analytics capabilities']
      }
    ],
    mobility: [
      {
        id: 'mobility-rideshare',
        name: 'Smart Mobility Platform',
        description: 'Build a comprehensive mobility-as-a-service platform',
        icon: '🚌',
        features: ['Multi-modal transport', 'Route optimization', 'Payment integration', 'Real-time tracking', 'User management'],
        requirements: ['Transportation expertise', 'Payment systems', 'Mobile development', 'Data analytics']
      },
      {
        id: 'mobility-micro',
        name: 'Micro-Mobility Management',
        description: 'Create a micro-mobility vehicle management platform',
        icon: '🛴',
        features: ['Vehicle tracking', 'Battery management', 'User app', 'Fleet optimization', 'Maintenance scheduling'],
        requirements: ['IoT expertise', 'Mobile development', 'Fleet management', 'Battery technology']
      }
    ]
  };

  const defaultTemplates = [
    {
      id: 'standard',
      name: 'Standard Startup',
      description: 'A comprehensive startup template with all essential features',
      icon: '🚀',
      features: ['User management', 'Payment processing', 'Analytics dashboard', 'API integration', 'Mobile app'],
      requirements: ['Full-stack development', 'Database design', 'Security implementation', 'Scalability planning']
    },
    {
      id: 'mvp',
      name: 'MVP Template',
      description: 'Minimal viable product with core features only',
      icon: '⚡',
      features: ['Basic user management', 'Core functionality', 'Simple dashboard', 'Essential integrations'],
      requirements: ['Rapid development', 'Core feature focus', 'Basic security', 'Quick deployment']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Solution',
      description: 'Enterprise-grade platform with advanced features',
      icon: '🏢',
      features: ['Advanced security', 'Multi-tenancy', 'Enterprise integrations', 'Advanced analytics', 'Compliance tools'],
      requirements: ['Enterprise architecture', 'Security expertise', 'Compliance knowledge', 'Scalability expertise']
    }
  ];

  const industryTemplates = industrySpecific[industry] || [];
  
  return [
    ...industryTemplates,
    ...defaultTemplates,
    {
      id: 'other',
      name: 'Custom Template',
      description: 'Define your own custom project template',
      icon: '📋',
      features: ['Custom features', 'Flexible requirements', 'Tailored approach'],
      requirements: ['Custom development', 'Flexible planning', 'Tailored implementation']
    }
  ];
};

