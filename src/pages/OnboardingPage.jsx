import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Building,
  Upload,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Zap,
  Globe,
  MapPin,
  Tag
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { useToast } from '../components/common/Toast';
import { extractPaletteFromImage } from '../utils/colorExtractor';
import FadeContent from '../components/ui/FadeContent';

const INDUSTRY_OPTIONS = [
  'Retail & E-Commerce',
  'Fashion & Apparel',
  'Café, Coffee & Roastery',
  'Restaurant & Dining',
  'Technology & Software',
  'Health & Wellness',
  'Beauty & Personal Care',
  'Home & Interior',
  'Art & Lifestyle'
];

const TONE_OPTIONS = [
  'Modern & Confident',
  'Warm, Organic & Mindful',
  'Sophisticated & Luxurious',
  'Playful, Fun & Engaging',
  'Bold, High-Energy & Punchy',
  'Minimalist & Elegant'
];

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram (Reels, Carousels & Grid)' },
  { id: 'facebook', label: 'Facebook Page & Groups' },
  { id: 'youtube', label: 'YouTube (Shorts & Community Posts)' }
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, hasSubscribed, completeBrandSetup } = useAuth();
  const { brandProfile, setBrandProfile, uploadBrandLogo, generateDailyBatch } = useContent();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const isCustomized = user?.id ? (localStorage.getItem(`sacp_brand_customized_${user.id}`) === 'true') : false;
  const isZenithDefault = !brandProfile?.name ||
    brandProfile.name.toLowerCase().includes('zenith') ||
    brandProfile.name === 'Aminoid AI';

  // Form states
  const [name, setName] = useState(isCustomized && !isZenithDefault ? brandProfile.name : '');
  const [industry, setIndustry] = useState(isCustomized && !isZenithDefault ? (brandProfile.type || brandProfile.industry || 'Retail & Lifestyle') : 'Retail & Lifestyle');
  const [tagline, setTagline] = useState(isCustomized && !isZenithDefault ? brandProfile.tagline : '');
  const [description, setDescription] = useState(isCustomized && !isZenithDefault ? (brandProfile.desc || brandProfile.description || '') : '');
  const [products, setProducts] = useState(isCustomized && !isZenithDefault ? (brandProfile.keywords || '') : '');
  const [location, setLocation] = useState(isCustomized && !isZenithDefault ? brandProfile.location : '');
  const [website, setWebsite] = useState(isCustomized && !isZenithDefault ? brandProfile.website : '');

  const [voice, setVoice] = useState(isCustomized && brandProfile.voice ? brandProfile.voice : 'Professional, Modern & Engaging');
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    brandProfile.preferred_platforms || ['Instagram', 'Facebook', 'YouTube']
  );
  const [cta, setCta] = useState(isCustomized && brandProfile.cta ? brandProfile.cta : 'Explore our collection or connect with us today');

  const togglePlatform = (pName) => {
    setSelectedPlatforms((prev) =>
      prev.includes(pName) ? prev.filter((x) => x !== pName) : [...prev, pName]
    );
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      if (user?.id) {
        localStorage.setItem(`sacp_brand_customized_${user.id}`, 'true');
      }
      if (uploadBrandLogo) {
        await uploadBrandLogo(file);
      }
      showToast('Brand logo uploaded and synchronized!', 'success');
    } catch (err) {
      showToast('Logo upload failed.', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const finalBrandName = name.trim() || 'My Brand';
      if (user?.id) {
        localStorage.setItem(`sacp_brand_customized_${user.id}`, 'true');
      }
      if (setBrandProfile) {
        await setBrandProfile((prev) => ({
          ...prev,
          name: finalBrandName,
          type: industry,
          industry,
          category: industry,
          tagline,
          desc: description,
          description,
          keywords: products,
          location,
          website,
          voice,
          messaging_style: voice,
          preferred_platforms: selectedPlatforms,
          cta
        }));
      }

      if (completeBrandSetup) {
        completeBrandSetup();
      }

      showToast(`Brand "${finalBrandName}" created successfully! Entering your Dashboard...`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showToast('Error saving brand profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg text-text font-sans selection:bg-primary/20 selection:text-primary flex flex-col transition-colors duration-200">
      {/* Ambient Emerald Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-primary/10 via-accent/5 to-transparent blur-[140px]" />
        <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-primary/8 via-accent/8 to-transparent blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-t from-border/30 to-transparent blur-[120px]" />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 py-12 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Progress Tracker */}
          <FadeContent effect="focus" duration={0.9} trigger="mount" className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Bento Setup Wizard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
              Teach AI Your Brand Identity
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto">
              Your autonomous marketing engine uses these parameters to generate daily photo crafts, video reels, and tailored copy.
            </p>

            {/* Step Pills */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  step === 1
                    ? 'bg-primary text-primary-on shadow-sm'
                    : 'bg-surface text-text-secondary border border-border'
                }`}
              >
                <span>1. Core Brand Profile</span>
              </div>
              <div className="w-6 h-0.5 bg-border" />
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  step === 2
                    ? 'bg-primary text-primary-on shadow-sm'
                    : 'bg-surface text-text-secondary border border-border'
                }`}
              >
                <span>2. Voice & Tone Strategy</span>
              </div>
            </div>
          </FadeContent>

          {/* Main Glassmorphic Form Card */}
          <FadeContent effect="mist" duration={1.2} trigger="mount" className="bg-surface backdrop-blur-2xl rounded-3xl border border-border shadow-lg p-6 sm:p-10 space-y-6 transition-colors">
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-text">Brand Identity & Offerings</h3>
                  <span className="text-xs text-primary font-semibold">Step 1 of 2</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Brand / Company Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme Studio or Aminoid Technologies"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Industry Sector</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-surface border border-border text-text focus-visible:outline-2 focus-visible:outline-focus-ring"
                    >
                      {INDUSTRY_OPTIONS.map((ind) => (
                        <option key={ind} value={ind} className="bg-surface text-text">{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Elevating everyday moments with sustainable design"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">About Your Brand Story</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your story, mission, offerings, and unique value proposition..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Key Offerings / Products</label>
                    <input
                      type="text"
                      value={products}
                      onChange={(e) => setProducts(e.target.value)}
                      placeholder="e.g. Handmade Ceramic Mugs, Organic Cotton Tees, Consulting"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Store / HQ Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. New York, London, or Online"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                    />
                  </div>
                </div>

                {/* Logo Upload Box */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Brand Logo</label>
                  <div className="p-4 rounded-2xl bg-bg border border-dashed border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {isCustomized && brandProfile?.logoUrl ? (
                          <img src={brandProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text block">Upload SVG / PNG Logo</span>
                        <span className="text-[11px] text-text-muted">Used for watermarks & creative synthesis</span>
                      </div>
                    </div>
                    <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold text-primary bg-surface border border-border hover:bg-bg transition shadow-xs focus-visible:outline-2 focus-visible:outline-focus-ring">
                      <span>{isUploadingLogo ? 'Uploading...' : 'Browse File'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-on hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    <span>Proceed to Strategy</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-text">Voice, Strategy & Channels</h3>
                  <span className="text-xs text-primary font-semibold">Step 2 of 2</span>
                </div>

                {/* Voice & Tone Chips */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2">Primary Messaging Voice</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((t) => {
                      const isSelected = voice === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setVoice(t)}
                          className={`p-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                              : 'bg-surface border-border text-text-secondary hover:text-text hover:bg-surface'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2">Connected Platforms</label>
                  <div className="space-y-2">
                    {PLATFORM_OPTIONS.map((plat) => {
                      const isChecked = selectedPlatforms.includes(plat.label.split(' ')[0]);
                      return (
                        <label
                          key={plat.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border cursor-pointer hover:border-primary/40 transition focus-visible:outline-2 focus-visible:outline-focus-ring"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePlatform(plat.label.split(' ')[0])}
                            className="w-4 h-4 rounded text-primary focus:ring-focus-ring border-border bg-surface"
                          />
                          <span className="text-xs font-semibold text-text">{plat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Default Call To Action</label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="e.g. Reserve your table or order fresh roast online"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text transition cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-on hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isSubmitting ? 'Finalizing Setup...' : 'Launch AI Studio'}</span>
                  </button>
                </div>
              </div>
            )}
          </FadeContent>
        </div>
      </main>

      <Footer />
    </div>
  );
}
