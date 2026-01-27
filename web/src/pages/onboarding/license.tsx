import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LicenseInfo {
  license_key: string;
  plan: string;
  is_valid: boolean;
  is_active: boolean;
  expiry_date?: string;
  max_users: number;
  max_records: number;
  features: any;
}

export const OnboardingLicensePage: React.FC = () => {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLicenseChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.slice(0, 5);
    if (cleaned.length > 5) formatted += '-' + cleaned.slice(5, 9);
    if (cleaned.length > 9) formatted += '-' + cleaned.slice(9, 13);
    if (cleaned.length > 13) formatted += '-' + cleaned.slice(13, 17);
    
    setLicenseKey(formatted);
    setError('');
  };

  const handleDemoMode = () => {
    setLicenseKey('DEMO-MODE-0000-0000');
    setError('');
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔵 License validation:', licenseKey);
      
      // Dinamik import - Tauri hazır olduğunda çalışır
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke<LicenseInfo>('validate_license', {
        request: { license_key: licenseKey }
      });
      
      console.log('✅ Result:', result);
      
      if (!result.is_valid) {
        setError('Lisans süresi dolmuş');
        return;
      }
      
      if (!result.is_active) {
        setError('Lisans aktif değil');
        return;
      }
      
      localStorage.setItem('validated_license_key', result.license_key);
      navigate('/onboarding/setup');
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.toString() || 'Lisans doğrulama hatası');
    } finally {
      setLoading(false);
    }
  };

  const isValidFormat = licenseKey.length === 19;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-white/95 backdrop-blur">
        <div className="space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="license-key">Lisans Kodu</Label>
            <Input
              id="license-key"
              type="text"
              maxLength={19}
              value={licenseKey}
              onChange={(e) => handleLicenseChange(e.target.value)}
              className="text-center font-mono text-lg"
              placeholder="BADER-XXXX-XXXX-XXXX"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              16 karakterlik lisans anahtarınızı girin
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleDemoMode}
            disabled={loading}
            className="w-full"
          >
            🎮 Demo Modu (LOCAL)
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/onboarding/welcome')}
              disabled={loading}
              className="w-full"
            >
              ← Geri
            </Button>
            <Button
              onClick={handleValidate}
              disabled={!isValidFormat || loading}
              className="w-full"
            >
              {loading ? 'Kontrol ediliyor...' : 'Devam Et →'}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
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
