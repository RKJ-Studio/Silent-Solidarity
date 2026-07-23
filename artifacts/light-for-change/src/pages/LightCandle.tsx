import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateCandle, useGetCountries, getGetCountriesQueryKey, useGetStates, getGetStatesQueryKey, useGetCities, getGetCitiesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function LightCandlePage() {
  const queryClient = useQueryClient();
  const createCandle = useCreateCandle();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '',
    state: '',
    city: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    displayName: '',
    message: ''
  });

  const [isLocating, setIsLocating] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const { data: countries } = useGetCountries({ query: { queryKey: getGetCountriesQueryKey() } });
  const { data: states } = useGetStates({ country: formData.country }, { query: { enabled: !!formData.country, queryKey: getGetStatesQueryKey({ country: formData.country }) } });
  const { data: cities } = useGetCities({ state: formData.state }, { query: { enabled: !!formData.state, queryKey: getGetCitiesQueryKey({ state: formData.state }) } });

  const handleDetectLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            // Reverse geocode using Nominatim (OSM) — free, no API key needed
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
              { headers: { 'User-Agent': 'LightForChange/1.0' } }
            );
            const data = await res.json();
            const addr = data.address || {};
            // Pick the best district-level name: district > county > city > town > suburb
            const district = addr.state_district || addr.county || addr.city_district || addr.city || addr.town || addr.suburb || addr.village || '';
            const state = addr.state || '';
            const country = addr.country || '';
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              country,
              state,
              city: district,
            }));
          } catch {
            // Fallback: just use coordinates without geocoding
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              country: '',
              state: '',
              city: ''
            }));
          }
          setIsLocating(false);
          setStep(2);
        },
        (error) => {
          console.error(error);
          toast({ title: 'Location error', description: 'Could not detect your location. Please select manually.' });
          setIsLocating(false);
        }
      );
    } else {
      toast({ title: 'Not supported', description: 'Geolocation is not supported by your browser.' });
      setIsLocating(false);
    }
  };

  const handleSubmit = () => {
    createCandle.mutate({
      data: {
        ...formData,
        acceptedTerms: acceptedRules,
      }
    }, {
      onSuccess: (candle) => {
        // Invalidate map data
        queryClient.invalidateQueries({ queryKey: ['/api/candles/clusters'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/candles/recent'] });
         
        setStep(4); // Success step
      },
     onError: (err: any) => {
       console.error('createCandle error', err);
       toast({ title: 'Could not create candle', description: err?.message || 'Server error' });
     }
    });
  };

  const nextStep = () => {
    if (step === 1 && !formData.latitude && (!formData.country)) {
      // Must select at least country or detect location
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center justify-center relative p-6 pt-24">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="w-full max-w-lg relative z-10">
          <div className="flex items-center justify-center mb-8 px-2">
            <div className="flex items-center gap-3 w-full max-w-xs">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-white/20'}`} />
                  {i < 3 && <div className={`h-0.5 w-12 transition-colors duration-300 ${step > i ? 'bg-primary' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8 md:p-12 relative overflow-hidden min-h-[420px] flex flex-col">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="font-serif text-3xl text-white mb-2">Where are you lighting from?</h2>
                  <p className="text-muted-foreground mb-8">Add your light to the map.</p>
                  
                  <button 
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="w-full py-4 glass-panel border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all text-white flex items-center justify-center gap-3 mb-6"
                  >
                    {isLocating ? <Loader2 className="animate-spin text-primary" /> : <MapPin className="text-primary" />}
                    {isLocating ? 'Locating...' : 'Use My Current Location'}
                  </button>

                  <div className="relative flex items-center py-4 mb-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-white/30 text-sm">or enter manually</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <div className="space-y-4 mb-auto">
                    <Select value={formData.country} onValueChange={(v) => setFormData(prev => ({...prev, country: v, state: '', city: ''}))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary h-12">
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10 text-white max-h-[300px]">
                        {countries?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    {/* State selection — only for India */}
                    {formData.country === 'India' && states && states.length > 0 && (
                      <Select value={formData.state} onValueChange={(v) => setFormData(prev => ({...prev, state: v, city: ''}))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary h-12">
                          <SelectValue placeholder="Select State / Union Territory" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-white/10 text-white max-h-[300px]">
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}

                    {formData.country && formData.country !== 'India' && (
                      <p className="text-xs text-white/40 px-1">Your candle will be placed on the map at the country level.</p>
                    )}
                    {formData.country === 'India' && formData.state && (
                      <p className="text-xs text-white/40 px-1">Your candle will be placed on the map at your state level. Use "Current Location" for district-level accuracy.</p>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={nextStep}
                      disabled={!formData.latitude && !formData.country}
                      className="px-6 py-3 bg-white text-background font-medium rounded-full hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Next <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="font-serif text-3xl text-white mb-2">Leave a message</h2>
                  <p className="text-muted-foreground mb-8">Automated safety filters check messages before publication. Keep yours respectful, lawful, and between 10–150 characters if included.</p>
                  
                  <div className="space-y-6 mb-auto">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Your Name</label>
                      <Input 
                        maxLength={50}
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({...prev, displayName: e.target.value}))}
                        placeholder="Anonymous"
                        className="bg-white/5 border-white/10 text-white focus:border-primary h-12 text-lg"
                      />
                      <div className="text-right text-xs text-white/30 mt-1">{formData.displayName.length}/50</div>
                    </div>

                    <div>
                      <label className="block text-sm text-white/70 mb-2">Dedication or Message</label>
                      <textarea 
                        maxLength={150}
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
                        placeholder="Write a respectful message (10–150 chars)"
                        className="w-full bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-4 min-h-[120px] resize-none text-lg"
                      />
                      <div className="text-right text-xs text-white/30 mt-1">{formData.message.length}/150 {formData.message.length>0 && formData.message.length<10 && <span className="text-amber-300"> — too short (min 10 chars)</span>}</div>
                    </div>
                  </div>

                  <label className="mt-5 flex items-start gap-3 text-xs text-white/60 leading-relaxed cursor-pointer">
                    <input type="checkbox" checked={acceptedRules} onChange={(e) => setAcceptedRules(e.target.checked)} className="mt-0.5 accent-amber-400" />
                    <span>I agree to the <Link href="/legal" className="text-primary underline" target="_blank">Terms, safety rules, and disclaimer</Link>. I will not share private information, threats, abusive content, or unlawful material.</span>
                  </label>

                  <div className="mt-8 flex justify-between">
                    <button 
                      onClick={() => setStep(1)}
                      className="p-3 text-white/50 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={nextStep}
                      disabled={!acceptedRules || (formData.message.length > 0 && formData.message.length < 10)}
                      className="px-6 py-3 bg-white text-background font-medium rounded-full hover:bg-primary transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Preview <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="mb-8 flex flex-col items-center">
                    <div className="w-24 h-24 mb-2 relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
                      <div className="candle-marker relative z-10 flex items-center justify-center transform scale-[2]">
                        <svg width="24" height="36" viewBox="0 0 24 36">
                          <defs>
                            <radialGradient id="flameGlow-preview" cx="50%" cy="60%" r="50%">
                              <stop offset="0%" stop-color="#FFD700" stop-opacity="1"/>
                              <stop offset="60%" stop-color="#FF8C00" stop-opacity="0.8"/>
                              <stop offset="100%" stop-color="#FF4500" stop-opacity="0"/>
                            </radialGradient>
                          </defs>
                          <ellipse cx="12" cy="14" rx="10" ry="12" fill="url(#flameGlow-preview)" opacity="0.4"/>
                          <path d="M12 2 C10 6 7 10 8 15 C9 19 11 21 12 22 C13 21 15 19 16 15 C17 10 14 6 12 2Z" fill="#FF8C00"/>
                          <path d="M12 6 C11 9 9 12 10 16 C10.5 18 11.5 20 12 20 C12.5 20 13.5 18 14 16 C15 12 13 9 12 6Z" fill="#FFD700"/>
                          <path d="M12 10 C11.5 12 11 14 11.5 16 C11.8 17.5 12 18.5 12 18.5 C12 18.5 12.2 17.5 12.5 16 C13 14 12.5 12 12 10Z" fill="white" opacity="0.6"/>
                          <rect x="9" y="22" width="6" height="12" rx="1" fill="#E8D5A3" opacity="0.9"/>
                          <rect x="9" y="22" width="6" height="4" rx="1" fill="#D4B896" opacity="0.6"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="font-serif text-2xl text-white mb-2">{formData.displayName || 'Anonymous'}</h3>
                    {formData.message && (
                      <p className="text-white/80 italic mb-4">"{formData.message}"</p>
                    )}
                    <p className="text-sm text-primary mb-2">
                      {[formData.city, formData.state, formData.country].filter(Boolean).join(', ') || 'Current Location'}
                    </p>
                    <p className="text-xs text-white/40 max-w-xs">Privacy: only state or country will be shown publicly. Exact coordinates are never shared or displayed.</p>
                  </div>

                  <div className="mt-auto w-full flex justify-between items-center">
                    <button 
                      onClick={() => setStep(2)}
                      className="p-3 text-white/50 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleSubmit}
                        disabled={createCandle.isPending}
                        className="px-6 py-3 bg-primary text-background font-bold rounded-full hover:bg-[#FF8C00] transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50"
                      >
                        {createCandle.isPending ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Add My Light</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center px-4"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-32 h-32 mb-8 relative flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-primary opacity-30 blur-3xl animate-glow-pulse" />
                    <div className="candle-marker relative z-10 flex items-center justify-center transform scale-[3]">
                      <svg width="24" height="36" viewBox="0 0 24 36">
                        <defs>
                          <radialGradient id="flameGlow-success" cx="50%" cy="60%" r="50%">
                            <stop offset="0%" stop-color="#FFD700" stop-opacity="1"/>
                            <stop offset="60%" stop-color="#FF8C00" stop-opacity="0.8"/>
                            <stop offset="100%" stop-color="#FF4500" stop-opacity="0"/>
                          </radialGradient>
                        </defs>
                        <ellipse cx="12" cy="14" rx="10" ry="12" fill="url(#flameGlow-success)" opacity="0.4"/>
                        <path d="M12 2 C10 6 7 10 8 15 C9 19 11 21 12 22 C13 21 15 19 16 15 C17 10 14 6 12 2Z" fill="#FF8C00"/>
                        <path d="M12 6 C11 9 9 12 10 16 C10.5 18 11.5 20 12 20 C12.5 20 13.5 18 14 16 C15 12 13 9 12 6Z" fill="#FFD700"/>
                        <path d="M12 10 C11.5 12 11 14 11.5 16 C11.8 17.5 12 18.5 12 18.5 C12 18.5 12.2 17.5 12.5 16 C13 14 12.5 12 12 10Z" fill="white" opacity="0.6"/>
                        <rect x="9" y="22" width="6" height="12" rx="1" fill="#E8D5A3" opacity="0.9"/>
                        <rect x="9" y="22" width="6" height="4" rx="1" fill="#D4B896" opacity="0.6"/>
                      </svg>
                    </div>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="font-serif text-4xl text-white mb-4"
                  >
                    Your light has been submitted.
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-muted-foreground mb-6"
                  >
                    Thank you for taking part peacefully. Your light is now part of this digital vigil.
                  </motion.p>

                  <Link href="/voices" className="px-6 py-3 bg-primary text-background font-bold rounded-full hover:bg-[#FF8C00] transition-colors text-sm">Read community voices</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
