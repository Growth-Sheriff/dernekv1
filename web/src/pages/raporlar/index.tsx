import React from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Users, CreditCard, TrendingUp, FileDown, FileSpreadsheet, Wallet, ClipboardCheck, FileText } from 'lucide-react';

const raporTurleri = [
  {
    title: 'Mali Rapor',
    description: 'Gelir-gider özeti, kasa durumları ve detaylı mali analiz',
    icon: TrendingUp,
    href: '/raporlar/mali',
    color: 'bg-green-500',
  },
  {
    title: 'Aidat Raporu',
    description: 'Aidat tahsilat durumu, gecikme analizi ve yıllık özet',
    icon: CreditCard,
    href: '/raporlar/aidat',
    color: 'bg-blue-500',
  },
  {
    title: 'Üyeler Raporu',
    description: 'Üye istatistikleri, demografik dağılım ve üyelik durumları',
    icon: Users,
    href: '/raporlar/uyeler',
    color: 'bg-purple-500',
  },
  {
    title: 'Bilanço Raporu',
    description: 'Dönem sonu varlık ve kaynak durumu, aktif-pasif dengesi',
    icon: FileSpreadsheet,
    href: '/raporlar/bilanco',
    color: 'bg-orange-500',
  },
  {
    title: 'Mizan Raporu',
    description: 'Hesap bazlı borç/alacak özeti ve bakiye kontrolü',
    icon: FileText,
    href: '/raporlar/mizan',
    color: 'bg-cyan-500',
  },
  {
    title: 'Kesin Hesap Raporu',
    description: 'Genel Kurula sunulacak yıllık mali rapor',
    icon: ClipboardCheck,
    href: '/raporlar/kesin-hesap',
    color: 'bg-indigo-500',
  },
  {
    title: 'Kasa Raporu',
    description: 'Kasa bazlı hareket dökümü ve bakiye analizi',
    icon: Wallet,
    href: '/raporlar/kasa',
    color: 'bg-teal-500',
  },
];

export const RaporlarIndexPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600 mt-1">Dernek faaliyetlerine ait detaylı raporlar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {raporTurleri.map((rapor) => (
          <Link
            key={rapor.title}
            to={rapor.href}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 group"
          >
            <div className={`w-12 h-12 ${rapor.color} rounded-lg flex items-center justify-center mb-4`}>
              <rapor.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {rapor.title}
            </h3>
            <p className="text-gray-600 mt-2 text-sm">{rapor.description}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              <FileDown className="w-4 h-4 mr-1" />
              CSV Dışa Aktar
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <PieChart className="w-6 h-6 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Hızlı İstatistikler</h2>
        </div>
        <p className="text-gray-600">
          Detaylı istatistikler ve analizler için yukarıdaki rapor türlerinden birini seçin.
          Tüm raporlar CSV formatında dışa aktarılabilir.
        </p>
      </div>
    </div>
  );
};

export default RaporlarIndexPage;
