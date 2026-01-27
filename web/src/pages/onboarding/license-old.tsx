import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export const OnboardingLicensePage: React.FC = () => {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState(['', '', '', '']);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLicenseChange = (index: number, value: string) => {
    const newKey = [...licenseKey];
    newKey[index] = value.toUpperCase();
    setLicenseKey(newKey);

    // Auto-focus next input
    if (value.length === 4 && index < 3) {
      const nextInput = document.getElementById(`license-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      if (demoMode) {
        // Demo mode - direkt setup'a geç
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate('/onboarding/setup');
      } else {
        // License validation
        const fullKey = licenseKey.join('-');
        // TODO: Implement license activation
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate('/onboarding/setup');
      }
    } catch (error) {
      console.error('Aktivasyon hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-white/95 backdrop-blur">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🔑</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Lisans Aktivasyonu
            </h2>
            <p className="text-gray-600">
              Lisans kodunuzu girin veya demo modu ile başlayın
            </p>
          </div>

          {/* License Key Inputs */}
          <div className="space-y-2">
            <Label>Lisans Kodu</Label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  id={`license-${index}`}
                  type="text"
                  maxLength={4}
                  value={licenseKey[index]}
                  onChange={(e) => handleLicenseChange(index, e.target.value)}
                  className="text-center font-mono text-lg"
                  placeholder="XXXX"
                  disabled={demoMode}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Format: BADER-XXXX-XXXX-XXXX
            </p>
          </div>

          {/* Demo Mode */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="demo"
              checked={demoMode}
              onCheckedChange={(checked) => setDemoMode(checked as boolean)}
            />
            <div>
              <Label htmlFor="demo" className="cursor-pointer font-medium">
                14 Gün Ücretsiz Deneme
              </Label>
              <p className="text-xs text-gray-600">
                Kayıt olmadan tüm özellikleri test edin
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleActivate}
              disabled={!demoMode && licenseKey.some(k => k.length < 4) || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Doğrulanıyor...' : 'Devam Et →'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/onboarding/welcome')}
              className="w-full"
            >
              ← Geri
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            Lisansınız yok mu?{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Satın Al
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingLicensePage;
