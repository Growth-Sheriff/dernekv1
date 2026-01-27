import React, { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Key, Calendar, Building2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { License } from '@/types/license';

export default function LicensesPage() {
    const { licenses, createLicense, tenants } = useAdminStore((state: any) => ({
        licenses: state.licenses,
        createLicense: state.createLicense,
        tenants: state.tenants,
    }));

    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLicense, setNewLicense] = useState<Partial<License>>({
        type: 'STANDARD',
        status: 'ACTIVE',
        price: 0
    });

    const filteredLicenses = licenses.filter((l: any) =>
        l.key.toLowerCase().includes(search.toLowerCase()) ||
        l.tenant_name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        try {
            // Mock ID generation
            const tenant = tenants.find((t: any) => t.id === newLicense.tenant_id);
            const licenseKey = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            await createLicense({
                ...newLicense,
                key: licenseKey,
                tenant_name: tenant?.name || 'Unknown',
                start_date: new Date().toISOString(),
                end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                features: ['AIDAT', 'MUHASEBE']
            });

            toast.success('Lisans oluşturuldu');
            setIsCreateOpen(false);
        } catch (e) {
            toast.error('Hata oluştu');
        }
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('Lisans anahtarı kopyalandı');
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Lisans Yönetimi</h1>
                    <p className="text-slate-500">Aktif ve süresi dolmuş lisans anahtarları</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Lisans
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Kullanıcı veya lisans anahtarı ara..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Lisans Anahtarı</TableHead>
                            <TableHead>Dernek</TableHead>
                            <TableHead>Tür / Paket</TableHead>
                            <TableHead>Bitiş Tarihi</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLicenses.map((lic: any) => (
                            <TableRow key={lic.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                                        <Key className="w-3 h-3 text-slate-400" />
                                        {lic.key}
                                        <button onClick={() => copyKey(lic.key)} className="hover:text-blue-600 ml-2">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium text-slate-700">{lic.tenant_name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{lic.type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {new Date(lic.end_date).toLocaleDateString()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={
                                        lic.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            lic.status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                    }>
                                        {lic.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm">Detay</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredLicenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Lisans bulunamadı
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Lisans Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Dernek Seç</Label>
                            <Select onValueChange={(val) => setNewLicense({ ...newLicense, tenant_id: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Dernek seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tenants.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Lisans Tipi</Label>
                            <Select onValueChange={(val: any) => setNewLicense({ ...newLicense, type: val })} defaultValue="STANDARD">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRIAL">Deneme (14 Gün)</SelectItem>
                                    <SelectItem value="STANDARD">Standart</SelectItem>
                                    <SelectItem value="PRO">Professional</SelectItem>
                                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Fiyat (TL)</Label>
                            <Input
                                type="number"
                                onChange={(e) => setNewLicense({ ...newLicense, price: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700">Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
