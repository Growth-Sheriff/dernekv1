import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheat, TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react';

export const KoyIndexPage: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Köy Kasaları',
      description: 'Köy kasalarını ve bakiyelerini yönetin',
      icon: Wallet,
      color: 'blue',
      path: '/koy/kasalar',
    },
    {
      title: 'Köy Gelirleri',
      description: 'Tarımsal gelir, bağış ve diğer gelirler',
      icon: TrendingUp,
      color: 'green',
      path: '/koy/gelirler',
    },
    {
      title: 'Köy Giderleri',
      description: 'Elektrik, su, yol bakım ve diğer giderler',
      icon: TrendingDown,
      color: 'red',
      path: '/koy/giderler',
    },
    {
      title: 'Köy Virmanları',
      description: 'Köy kasaları arası para transferleri',
      icon: ArrowLeftRight,
      color: 'purple',
      path: '/koy/virmanlar',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
      green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
      red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wheat className="w-8 h-8 text-amber-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Köy Modülü</h1>
          <p className="text-gray-500 mt-1.5">Köy mali işlemleri ve muhasebe yönetimi</p>
        </div>
      </div>

      <div className="card-macos p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
        <h2 className="text-lg font-semibold text-amber-900 mb-2">ℹ️ Köy Modülü Hakkında</h2>
        <p className="text-amber-800 text-sm leading-relaxed">
          Köy modülü, dernek muhasebesinden <strong>tamamen bağımsız</strong> bir muhasebe sistemidir. 
          Köy ile ilgili tüm mali işlemler (kasa, gelir, gider, virman) bu modülde ayrı olarak tutulur ve 
          dernek muhasebesine karışmaz. Bu sayede hem dernek hem de köy için ayrı ayrı raporlama yapılabilir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const colors = getColorClasses(module.color);
          
          return (
            <button
              key={module.path}
              onClick={() => navigate(module.path)}
              className={`${colors.bg} rounded-xl p-6 border-2 border-transparent hover:border-${module.color}-200 transition-all duration-200 text-left group hover:shadow-lg`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 ${colors.bg} rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold ${colors.text} mb-2`}>
                    {module.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {module.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KoyIndexPage;
