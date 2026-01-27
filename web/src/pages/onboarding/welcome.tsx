import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const OnboardingWelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 bg-white/95 backdrop-blur">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-bold text-white">B</span>
            </div>
          </div>

          {/* Başlık */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              BADER'e Hoş Geldiniz!
            </h1>
            <p className="text-lg text-gray-600">
              Dernek yönetiminizi kolaylaştırmak için tasarlandı
            </p>
          </div>

          {/* Özellikler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900">Üye Yönetimi</h3>
              <p className="text-sm text-gray-600">Tüm üyelerinizi tek yerden yönetin</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold text-gray-900">Mali Takip</h3>
              <p className="text-sm text-gray-600">Gelir-gider ve aidat takibi</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900">Raporlar</h3>
              <p className="text-sm text-gray-600">Detaylı raporlar ve analizler</p>
            </div>
          </div>

          {/* Butonlar */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => navigate('/onboarding/license')}
              className="w-full h-12 text-lg"
              size="lg"
            >
              Hemen Başlayalım →
            </Button>
            
            <p className="text-sm text-gray-500">
              Zaten hesabınız var mı?{' '}
              <button
                onClick={() => window.location.href = '/'}
                className="text-blue-600 hover:underline font-medium"
              >
                Giriş Yapın
              </button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingWelcomePage;
