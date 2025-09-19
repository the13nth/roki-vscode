'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ClientOnly from './ClientOnly';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import {
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Building,
  Search,
  Filter,
  Clock,
  Award,
  Briefcase,
  DollarSign,
  Grid,
  List,
  Plus,
  CheckCircle,
  AlertCircle,
  Edit,
  Save
} from 'lucide-react';

interface Opportunity {
  Opportunity: string;
  Description: string;
  Type: string;
  "Close Date": string;
  Status: string;
  Link: string;
  "Eligible Countries": string;
  "For Female Founders": boolean;
  "Sectors of Interest": string;
}

export default function OpportunitiesView() {
  // Use the same admin check as navigation
  const { isAdmin, userLoaded, orgLoaded } = useAdminCheck();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [femaleFoundersOnly, setFemaleFoundersOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Admin form state
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<{
    supabase_count: number;
    json_count: number;
    migration_needed: boolean;
    migration_status: string;
  } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const [formOpportunity, setFormOpportunity] = useState({
    Opportunity: '',
    Description: '',
    Type: 'Program',
    'Close Date': '',
    Status: 'Open',
    Link: '',
    'Eligible Countries': '',
    'For Female Founders': false,
    'Sectors of Interest': ''
  });

  const isEditMode = editingOpportunity !== null;

  useEffect(() => {
    loadOpportunities();
  }, []);

  useEffect(() => {
    if (userLoaded && orgLoaded && isAdmin) {
      checkMigrationStatus();
    }
  }, [userLoaded, orgLoaded, isAdmin]);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, searchTerm, typeFilter, sectorFilter, femaleFoundersOnly]);

  const loadOpportunities = async () => {
    try {
      console.log('Loading opportunities...');
      setError(null);

      // Try API first, fallback to direct JSON file
      let response;
      let data;

      try {
        response = await fetch('/api/opportunities');
        const result = await response.json();

        if (response.ok && result.success) {
          data = result.opportunities;
        } else {
          throw new Error('API failed, trying direct file access');
        }
      } catch (apiError) {
        console.log('API failed, falling back to direct file access');
        response = await fetch(`/final_opportunities.json?t=${Date.now()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }

      console.log('Loaded opportunities:', data.length);
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const filterOpportunities = () => {
    let filtered = opportunities;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.Opportunity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.Description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp["Sectors of Interest"].toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(opp => opp.Type === typeFilter);
    }

    // Sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(opp =>
        opp["Sectors of Interest"].toLowerCase().includes(sectorFilter.toLowerCase())
      );
    }

    // Female founders filter
    if (femaleFoundersOnly) {
      filtered = filtered.filter(opp => opp["For Female Founders"]);
    }

    setFilteredOpportunities(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'competition':
        return <Award className="h-4 w-4" />;
      case 'program':
        return <Briefcase className="h-4 w-4" />;
      case 'accelerator':
        return <Building className="h-4 w-4" />;
      case 'incubator':
        return <Building className="h-4 w-4" />;
      case 'grant':
        return <DollarSign className="h-4 w-4" />;
      case 'award':
        return <Award className="h-4 w-4" />;
      case 'hackathon':
        return <Users className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'competition':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'program':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accelerator':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'incubator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'grant':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'award':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'hackathon':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Use a more consistent date formatting to avoid hydration issues
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }

      // Format as YYYY-MM-DD for consistency
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  const getDaysToDeadline = (dateString: string): { days: number; text: string; showBadge: boolean; badgeVariant: 'destructive' | 'secondary' | 'default' } => {
    try {
      const closeDate = new Date(dateString);
      if (isNaN(closeDate.getTime())) {
        return { days: 0, text: '', showBadge: false, badgeVariant: 'secondary' };
      }

      // Use UTC to avoid timezone issues between server and client
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      closeDate.setHours(0, 0, 0, 0);

      const diffTime = closeDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { days: diffDays, text: `${Math.abs(diffDays)} days overdue`, showBadge: true, badgeVariant: 'destructive' };
      } else if (diffDays === 0) {
        return { days: 0, text: 'Ends today', showBadge: true, badgeVariant: 'destructive' };
      } else if (diffDays === 1) {
        return { days: 1, text: '1 day left', showBadge: true, badgeVariant: 'destructive' };
      } else if (diffDays <= 7) {
        return { days: diffDays, text: `${diffDays} days left`, showBadge: true, badgeVariant: 'destructive' };
      } else if (diffDays <= 30) {
        return { days: diffDays, text: `${diffDays} days left`, showBadge: true, badgeVariant: 'secondary' };
      } else {
        return { days: diffDays, text: `${diffDays} days left`, showBadge: true, badgeVariant: 'default' };
      }
    } catch {
      return { days: 0, text: '', showBadge: false, badgeVariant: 'secondary' };
    }
  };

  const uniqueTypes = [...new Set(opportunities.map(opp => opp.Type))];
  const uniqueSectors = [...new Set(
    opportunities.flatMap(opp =>
      opp["Sectors of Interest"].split(',').map(s => s.trim()).filter(s => s && s !== 'Agnostic')
    )
  )].sort();

  // Predefined options for form
  const opportunityTypes = ['Competition', 'Program', 'Accelerator', 'Incubator', 'Grant', 'Fellowship', 'Challenge', 'Award', 'Hackathon'];
  const statusOptions = ['Open', 'Closed', 'Coming Soon'];

  const africanCountries = [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Cape Verde',
    'Central African Republic', 'Chad', 'Comoros', 'Congo', 'Democratic Republic of Congo', 'Djibouti',
    'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana',
    'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
    'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
    'Nigeria', 'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone',
    'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
    'Zambia', 'Zimbabwe', 'SSA', 'Any'
  ].sort();

  const sectorOptions = [
    'Agnostic', 'Healthcare', 'FinTech', 'Climate', 'AgricTech', 'Education', 'Energy', 'AI',
    'Deeptech', 'Fashion', 'Orange Economy', 'Mobility', 'Recycling', 'Sustainable Development'
  ].sort();

  const handleSubmitOpportunity = async () => {
    if (!formOpportunity.Opportunity || !formOpportunity.Description || !formOpportunity['Close Date']) {
      setSubmitMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Create the opportunity object
      const opportunityData = {
        ...formOpportunity,
        'Eligible Countries': selectedCountries.length > 0 ? selectedCountries.join(', ') : 'Any',
        'Sectors of Interest': selectedSectors.length > 0 ? selectedSectors.join(', ') : 'Agnostic',
        ...(isEditMode && { originalOpportunity: editingOpportunity.Opportunity })
      };

      // Send to API
      const response = await fetch('/api/opportunities', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'add'} opportunity`);
      }

      // Update local state
      if (isEditMode) {
        setOpportunities(prev => prev.map(opp =>
          opp.Opportunity === editingOpportunity.Opportunity ? result.opportunity : opp
        ));
      } else {
        setOpportunities(prev => [result.opportunity, ...prev]);
      }

      setSubmitMessage({
        type: 'success',
        text: `Opportunity ${isEditMode ? 'updated' : 'added'} successfully!`
      });

      // Reset form
      resetForm();

      // Close form after a delay
      setTimeout(() => {
        setShowOpportunityForm(false);
        setSubmitMessage(null);
      }, 2000);

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} opportunity:`, error);
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'add'} opportunity. Please try again.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormOpportunity({
      Opportunity: '',
      Description: '',
      Type: 'Program',
      'Close Date': '',
      Status: 'Open',
      Link: '',
      'Eligible Countries': '',
      'For Female Founders': false,
      'Sectors of Interest': ''
    });
    setSelectedCountries([]);
    setSelectedSectors([]);
    setEditingOpportunity(null);
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleSectorToggle = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector)
        ? prev.filter(s => s !== sector)
        : [...prev, sector]
    );
  };

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/opportunities/migrate');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMigrationStatus(result);
        }
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  };

  const handleMigration = async () => {
    if (!migrationStatus?.migration_needed) return;

    setIsMigrating(true);
    try {
      const response = await fetch('/api/opportunities/migrate', {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitMessage({
          type: 'success',
          text: `Successfully migrated ${result.migrated_count} opportunities to Supabase!`
        });

        // Refresh data
        await loadOpportunities();
        await checkMigrationStatus();

        setTimeout(() => setSubmitMessage(null), 5000);
      } else {
        setSubmitMessage({
          type: 'error',
          text: result.error || 'Migration failed'
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Migration failed. Please try again.'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormOpportunity(opportunity);

    // Parse countries and sectors from the opportunity
    const countries = opportunity["Eligible Countries"]
      ? opportunity["Eligible Countries"].split(',').map(c => c.trim())
      : [];
    const sectors = opportunity["Sectors of Interest"]
      ? opportunity["Sectors of Interest"].split(',').map(s => s.trim())
      : [];

    setSelectedCountries(countries);
    setSelectedSectors(sectors);
    setShowOpportunityForm(true);
  };

  const handleAddOpportunity = () => {
    resetForm();
    setShowOpportunityForm(true);
  };



  if (loading || !userLoaded || !orgLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading opportunities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <h3 className="text-lg font-semibold mb-2">Error Loading Opportunities</h3>
          <p>{error}</p>
        </div>
        <Button onClick={loadOpportunities} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Startup Opportunities</h1>
          <p className="text-gray-600">
            Discover funding, accelerator, and competition opportunities for African startups.
          </p>
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2" suppressHydrationWarning>
            Debug: Loaded {opportunities.length} opportunities, showing {filteredOpportunities.length} after filters
            <ClientOnly>
              {userLoaded && orgLoaded && isAdmin && migrationStatus && (
                <span className="ml-4">
                  | Supabase: {migrationStatus.supabase_count} | JSON: {migrationStatus.json_count} |
                  Status: {migrationStatus.migration_status}
                </span>
              )}
            </ClientOnly>
          </div>
        </div>

        {/* Admin Controls - Client-side only to prevent hydration issues */}
        <ClientOnly>
          {userLoaded && orgLoaded && isAdmin && (
            <div className="flex items-center gap-2">
              {/* Migration Button */}
              {migrationStatus?.migration_needed && (
                <Button
                  variant="outline"
                  onClick={handleMigration}
                  disabled={isMigrating}
                  className="flex items-center gap-2"
                >
                  {isMigrating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Migrating...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Migrate to Supabase ({migrationStatus.json_count} items)
                    </>
                  )}
                </Button>
              )}

              {/* Add Opportunity Button */}
              <Button
                onClick={handleAddOpportunity}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Opportunity
              </Button>

              {/* Opportunity Form Dialog */}
              <Dialog open={showOpportunityForm} onOpenChange={setShowOpportunityForm}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Opportunity' : 'Add New Opportunity'}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Success/Error Messages */}
                    {submitMessage && (
                      <Alert variant={submitMessage.type === 'error' ? 'destructive' : 'default'}>
                        {submitMessage.type === 'success' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{submitMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Basic Information</h3>

                        <div>
                          <Label htmlFor="opportunity-name">Opportunity Name *</Label>
                          <Input
                            id="opportunity-name"
                            value={formOpportunity.Opportunity}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, Opportunity: e.target.value }))}
                            placeholder="e.g., Y Combinator W24, Techstars Boston"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={formOpportunity.Description}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, Description: e.target.value }))}
                            placeholder="Brief description of the opportunity..."
                            rows={4}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="type">Type *</Label>
                          <select
                            id="type"
                            value={formOpportunity.Type}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, Type: e.target.value }))}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
                          >
                            {opportunityTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="close-date">Close Date *</Label>
                          <Input
                            id="close-date"
                            type="date"
                            value={formOpportunity['Close Date']}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, 'Close Date': e.target.value }))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="status">Status</Label>
                          <select
                            id="status"
                            value={formOpportunity.Status}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, Status: e.target.value }))}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
                          >
                            {statusOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="link">Application Link</Label>
                          <Input
                            id="link"
                            type="url"
                            value={formOpportunity.Link}
                            onChange={(e) => setFormOpportunity(prev => ({ ...prev, Link: e.target.value }))}
                            placeholder="https://..."
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formOpportunity['For Female Founders']}
                              onChange={(e) => setFormOpportunity(prev => ({ ...prev, 'For Female Founders': e.target.checked }))}
                              className="rounded border-gray-300"
                            />
                            <span>For Female Founders</span>
                          </Label>
                        </div>
                      </div>

                      {/* Eligibility and Sectors */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Eligibility & Focus</h3>

                        <div>
                          <Label>Eligible Countries</Label>
                          <div className="mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCountries(africanCountries)}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCountries([])}
                              >
                                Clear All
                              </Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/30">
                              <div className="grid grid-cols-2 gap-2">
                                {africanCountries.map(country => (
                                  <label key={country} className="flex items-center space-x-2 text-sm hover:bg-muted/50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={selectedCountries.includes(country)}
                                      onChange={() => handleCountryToggle(country)}
                                      className="rounded border-gray-300"
                                    />
                                    <span>{country}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Selected ({selectedCountries.length}): {selectedCountries.length > 0 ? selectedCountries.join(', ') : 'Any'}
                          </p>
                        </div>

                        <div>
                          <Label>Sectors of Interest</Label>
                          <div className="mt-2">
                            <div className="flex gap-2 mb-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSectors(sectorOptions)}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSectors([])}
                              >
                                Clear All
                              </Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/30">
                              <div className="grid grid-cols-2 gap-2">
                                {sectorOptions.map(sector => (
                                  <label key={sector} className="flex items-center space-x-2 text-sm hover:bg-muted/50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={selectedSectors.includes(sector)}
                                      onChange={() => handleSectorToggle(sector)}
                                      className="rounded border-gray-300"
                                    />
                                    <span>{sector}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Selected ({selectedSectors.length}): {selectedSectors.length > 0 ? selectedSectors.join(', ') : 'Agnostic'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowOpportunityForm(false);
                          resetForm();
                          setSubmitMessage(null);
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitOpportunity}
                        disabled={isSubmitting || !formOpportunity.Opportunity || !formOpportunity.Description || !formOpportunity['Close Date']}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isEditMode ? 'Updating...' : 'Adding...'}
                          </>
                        ) : (
                          <>
                            {isEditMode ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {isEditMode ? 'Update Opportunity' : 'Add Opportunity'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>


            </div>
          )}
        </ClientOnly>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sector</label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Sectors</option>
                {uniqueSectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Female Founders Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Target</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={femaleFoundersOnly}
                  onChange={(e) => setFemaleFoundersOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Female Founders Only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary and View Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredOpportunities.length} of {opportunities.length} opportunities
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={loadOpportunities} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Opportunities Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOpportunities.map((opportunity, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{opportunity.Opportunity}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${getTypeColor(opportunity.Type)} flex items-center gap-1`}>
                        {getTypeIcon(opportunity.Type)}
                        {opportunity.Type}
                      </Badge>
                      {opportunity["For Female Founders"] && (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                          <Users className="h-3 w-3 mr-1" />
                          Female Founders
                        </Badge>
                      )}
                      {(() => {
                        const deadline = getDaysToDeadline(opportunity["Close Date"]);
                        return deadline.showBadge && (
                          <Badge
                            variant={deadline.badgeVariant}
                            className="flex items-center gap-1"
                            suppressHydrationWarning
                          >
                            <Clock className="h-3 w-3" />
                            {deadline.text}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Description */}
                  {opportunity.Description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {opportunity.Description}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Closes:</span>
                      <span suppressHydrationWarning>{formatDate(opportunity["Close Date"])}</span>
                    </div>

                    {opportunity["Eligible Countries"] && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Countries:</span>
                        <span className="text-gray-600">{opportunity["Eligible Countries"]}</span>
                      </div>
                    )}

                    {opportunity["Sectors of Interest"] && (
                      <div className="flex items-start gap-2">
                        <Building className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="font-medium">Sectors:</span>
                        <div className="flex flex-wrap gap-1">
                          {opportunity["Sectors of Interest"].split(',').map((sector, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {sector.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 space-y-2">
                    {/* Admin Edit Button */}
                    <ClientOnly>
                      {userLoaded && orgLoaded && isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOpportunity(opportunity)}
                          className="w-full flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </ClientOnly>

                    {/* Apply Button */}
                    <Button
                      asChild
                      className="w-full"
                      variant={opportunity.Status === 'Closed' ? 'secondary' : 'default'}
                      disabled={opportunity.Status === 'Closed'}
                    >
                      <a
                        href={opportunity.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        {opportunity.Status === 'Closed' ? 'Closed' : 'Apply'}
                        {opportunity.Status !== 'Closed' && <ExternalLink className="h-4 w-4" />}
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Opportunity</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Close Date</th>
                    <th className="text-left p-4 font-medium">Countries</th>
                    <th className="text-left p-4 font-medium">Sectors</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opportunity, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{opportunity.Opportunity}</div>
                          {opportunity.Description && (
                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {opportunity.Description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {opportunity["For Female Founders"] && (
                              <Badge variant="secondary" className="bg-pink-100 text-pink-800 text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Female Founders
                              </Badge>
                            )}
                            {(() => {
                              const deadline = getDaysToDeadline(opportunity["Close Date"]);
                              return deadline.showBadge && (
                                <Badge
                                  variant={deadline.badgeVariant}
                                  className="flex items-center gap-1 text-xs"
                                  suppressHydrationWarning
                                >
                                  <Clock className="h-3 w-3" />
                                  {deadline.text}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getTypeColor(opportunity.Type)} flex items-center gap-1 w-fit`}>
                          {getTypeIcon(opportunity.Type)}
                          {opportunity.Type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm" suppressHydrationWarning>
                        {formatDate(opportunity["Close Date"])}
                      </td>
                      <td className="p-4 text-sm">
                        {opportunity["Eligible Countries"] || 'Not specified'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {opportunity["Sectors of Interest"].split(',').slice(0, 3).map((sector, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {sector.trim()}
                            </Badge>
                          ))}
                          {opportunity["Sectors of Interest"].split(',').length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{opportunity["Sectors of Interest"].split(',').length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={opportunity.Status === 'Closed' ? 'secondary' : 'default'}
                          className={opportunity.Status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}
                        >
                          {opportunity.Status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {/* Admin Edit Button */}
                          <ClientOnly>
                            {userLoaded && orgLoaded && isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOpportunity(opportunity)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                          </ClientOnly>

                          {/* Apply Button */}
                          <Button
                            asChild
                            size="sm"
                            variant={opportunity.Status === 'Closed' ? 'secondary' : 'default'}
                            disabled={opportunity.Status === 'Closed'}
                          >
                            <a
                              href={opportunity.Link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              {opportunity.Status === 'Closed' ? 'Closed' : 'Apply'}
                              {opportunity.Status !== 'Closed' && <ExternalLink className="h-4 w-4" />}
                            </a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
          <p className="text-gray-600">
            Try adjusting your filters to see more opportunities.
          </p>
        </div>
      )}
    </div>
  );
}