/**
 * Tauri Dialog API Shim - Web Versiyonu
 */

export const open = async (options?: {
    multiple?: boolean;
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}) => {
    // Web'de file input kullanarak dosya seçimi yapılır
    return new Promise<string | string[] | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options?.multiple || false;

        if (options?.filters) {
            const extensions = options.filters.flatMap(f => f.extensions.map(e => `.${e}`));
            input.accept = extensions.join(',');
        }

        input.onchange = () => {
            if (input.files && input.files.length > 0) {
                if (options?.multiple) {
                    resolve(Array.from(input.files).map(f => URL.createObjectURL(f)));
                } else {
                    resolve(URL.createObjectURL(input.files[0]));
                }
            } else {
                resolve(null);
            }
        };

        input.click();
    });
};

export const save = async (options?: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}) => {
    // Web'de save dialog doğrudan açılamaz, download link döndürürüz
    console.log('[WEB] Save dialog requested', options);
    return options?.defaultPath || 'download';
};

export const message = async (msg: string, options?: { title?: string; type?: string }) => {
    alert(msg);
};

export const confirm = async (msg: string, options?: { title?: string }) => {
    return window.confirm(msg);
};
