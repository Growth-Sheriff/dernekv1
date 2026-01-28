import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invoke } from '@tauri-apps/api/core';
import api from '@/lib/api';
import { toast } from 'sonner';

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
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    // Get Device ID on mount
    const getDeviceId = async () => {
      try {
        const id = await invoke<string>('get_device_id');
        setDeviceId(id);
      } catch (err) {
        console.error('Device ID error:', err);
      }
    };
    getDeviceId();
  }, []);

  const handleLicenseChange = (value: string) => {
    // Sadece alfanümerik ve tireye izin ver, otomatik formatlamayı kaldır
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setLicenseKey(cleaned);
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
      console.log('🔵 License validation starting:', licenseKey);

      // 1. Try REMOTE validation first (Hybrid Mode)
      if (licenseKey !== 'DEMO-MODE-0000-0000') {
        try {
          console.log('🌐 Attempting remote validation...');
          console.log('📡 API URL: http://157.90.154.48:8000/api/v1/licenses/validate');
          console.log('📡 License Key:', licenseKey);

          const remoteResult = await api.license.validate(licenseKey, deviceId || 'unknown-device');
          console.log('✅ Remote Validation Result:', JSON.stringify(remoteResult));

          if (remoteResult && remoteResult.valid === true) {
            // Success - Save for next step
            localStorage.setItem('validated_license_key', licenseKey);
            localStorage.setItem('license_mode', 'hybrid');
            if (remoteResult.license) {
              localStorage.setItem('remote_license_info', JSON.stringify(remoteResult.license));
            }

            toast.success('Lisans doğrulandı (Online)');
            navigate('/onboarding/setup');
            return;
          } else {
            // Remote said invalid
            const msg = remoteResult?.message || 'Lisans geçersiz veya süresi dolmuş';
            console.error('❌ Remote validation returned invalid:', msg);
            setError(msg);
            setLoading(false);
            return; // Stop here, don't fallback if remote explicitly rejected
          }
        } catch (networkError: any) {
          console.error('❌ Remote validation EXCEPTION:', networkError);
          console.error('❌ Error type:', typeof networkError);
          console.error('❌ Error message:', networkError?.message);
          console.error('❌ Error stack:', networkError?.stack);

          // Show network error and fall through to local validation
          toast.error('Sunucu bağlantı hatası, yerel mod deneniyor...');
        }
      }

      // 2. Fallback to LOCAL validation (Offline/Demo)
      console.log('🏠 Attempting local validation...');
      const result = await invoke<LicenseInfo>('validate_license', {
        request: { license_key: licenseKey }
      });

      console.log('✅ Local Result:', result);

      if (!result.is_valid) {
        setError('Lisans süresi dolmuş');
        return;
      }

      if (!result.is_active) {
        setError('Lisans aktif değil');
        return;
      }

      localStorage.setItem('validated_license_key', result.license_key);
      localStorage.setItem('license_mode', 'local');

      if (licenseKey === 'DEMO-MODE-0000-0000') {
        toast.info('Demo modu aktif edildi');
      } else {
        toast.success('Lisans doğrulandı (Offline Mod)');
      }

      navigate('/onboarding/setup');

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.toString() || 'Lisans doğrulama hatası');
    } finally {
      setLoading(false);
    }
  };

  const isValidFormat = licenseKey.length > 5;

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
              value={licenseKey}
              onChange={(e) => handleLicenseChange(e.target.value)}
              className="text-center font-mono text-lg"
              placeholder="Lisans Anahtarı"
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
