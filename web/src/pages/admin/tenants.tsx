import React, { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Building2, MoreVertical, Ban, CheckCircle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function TenantsPage() {
    const { tenants, createTenant, suspendTenant, fetchTenants } = useAdminStore((state: any) => ({
        tenants: state.tenants,
        createTenant: state.createTenant,
        suspendTenant: state.suspendTenant,
        fetchTenants: state.fetchTenants,
    }));

    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTenant, setNewTenant] = useState({ name: '', slug: '', contact_email: '', max_users: 100 });

    React.useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const filteredTenants = tenants.filter((t: any) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.contact_email.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        try {
            await createTenant({
                name: newTenant.name,
                slug: newTenant.slug,
                contact_email: newTenant.contact_email,
                max_users: newTenant.max_users
            });
            toast.success('Yeni dernek oluşturuldu');
            setIsCreateOpen(false);
            setNewTenant({ name: '', slug: '', contact_email: '', max_users: 100 });
        } catch (error) {
            toast.error('Dernek oluşturulurken hata oluştu');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dernek Yönetimi</h1>
                    <p className="text-slate-500">Sisteme kayıtlı tüm dernek ve kuruluşlar</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Dernek
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Dernek ara..."
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
                            <TableHead>Dernek Adı</TableHead>
                            <TableHead>İletişim</TableHead>
                            <TableHead>Kayıt Tarihi</TableHead>
                            <TableHead>Lisans Limiti</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTenants.map((tenant: any) => (
                            <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600">
                                            {tenant.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{tenant.name}</p>
                                            <p className="text-xs text-slate-500">/{tenant.slug}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        <p>{tenant.contact_email}</p>
                                        <p className="text-slate-500">{tenant.phone}</p>
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{tenant.max_users} Kullanıcı</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktif</Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                            <DropdownMenuItem>Düzenle</DropdownMenuItem>
                                            <DropdownMenuItem>Lisans Detayları</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <Ban className="w-4 h-4 mr-2" />
                                                Askıya Al
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredTenants.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Kayıt bulunamadı
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
                        <DialogTitle>Yeni Dernek Ekle</DialogTitle>
                        <DialogDescription>
                            Sisteme yeni bir dernek/kuruluş ekleyin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Dernek Adı</Label>
                            <Input
                                value={newTenant.name}
                                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Slug (URL)</Label>
                            <Input
                                value={newTenant.slug}
                                onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                                placeholder="ornek-dernek"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>İletişim E-posta</Label>
                            <Input
                                value={newTenant.contact_email}
                                onChange={(e) => setNewTenant({ ...newTenant, contact_email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kullanıcı Limiti</Label>
                            <Input
                                type="number"
                                value={newTenant.max_users}
                                onChange={(e) => setNewTenant({ ...newTenant, max_users: parseInt(e.target.value) })}
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
