import React, { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Key, Calendar, Building2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { License } from '@/types/license';

export default function LicensesPage() {
    const { licenses, createLicense, tenants, fetchLicenses } = useAdminStore((state: any) => ({
        licenses: state.licenses,
        createLicense: state.createLicense,
        tenants: state.tenants,
        fetchLicenses: state.fetchLicenses,
    }));

    React.useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLicense, setNewLicense] = useState<Partial<License>>({
        type: 'STANDARD',
        status: 'ACTIVE',
        price: 0
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredLicenses = licenses.filter((l: any) =>
        l.key.toLowerCase().includes(search.toLowerCase()) ||
        l.tenant_name.toLowerCase().includes(search.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
    const paginatedLicenses = filteredLicenses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const handleCreate = async () => {
        try {
            // Mock ID generation
            const tenant = tenants.find((t: any) => t.id === newLicense.tenant_id);
            const licenseKey = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            await createLicense({
                key: licenseKey,
                license_type: newLicense.type || 'STANDARD',
                start_date: new Date().toISOString(),
                end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                tenant_id: tenant?.id,
                is_active: true
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
                        {paginatedLicenses.map((lic: any) => (
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
                                        {lic.end_date ? new Date(lic.end_date).toLocaleDateString() : 'Süresiz'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={
                                        lic.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }>
                                        {lic.is_active ? 'AKTİF' : 'PASİF'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm">Detay</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-500">
                        Toplam <span className="font-medium text-slate-700">{filteredLicenses.length}</span> kayıttan
                        <span className="font-medium text-slate-700"> {(currentPage - 1) * itemsPerPage + 1}</span> -
                        <span className="font-medium text-slate-700"> {Math.min(currentPage * itemsPerPage, filteredLicenses.length)}</span> arası gösteriliyor
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                        </Button>
                        <div className="flex items-center px-4 text-sm font-medium">
                            Sayfa {currentPage} / {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                            Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

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
