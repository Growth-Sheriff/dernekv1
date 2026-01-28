import { useEffect } from 'react';
import { invoke } from '@/lib/api-client';
import { useLicenseStore } from '@/store/licenseStore';
import { useAuthStore } from '@/store/authStore';

export const useLicenseCheck = () => {
    const { setLicense } = useLicenseStore();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated) {
            checkLicense();
        }
    }, [isAuthenticated]);

    const checkLicense = async () => {
        try {
            const license = await invoke<any>('check_license');
            if (license) {
                setLicense(license);
            }
        } catch (error) {
            console.error('License check failed:', error);
        }
    };
};
