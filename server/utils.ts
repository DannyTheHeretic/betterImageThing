import { Dirent, existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const IMAGE_PATH = process.env.DESKTHING_ENV == 'development' ? '' : join(__dirname, '../images')

export const saveImageReferenceFromURL = async (url: string): Promise<string | string[] | undefined> => {
    try {
        if (url.startsWith('https')) {
            return url
        }
        if (await isPathDirectory(url)) {
            return await handleDir(url)
        }
        return await handleFile(url)
    } catch (error) {
        console.error('Error saving image reference: ', error)
        return
    }
}


async function isPathDirectory(path: string): Promise<boolean> {
    try {
        const stats = await stat(path); // Or use fs.stat with a callback
        return stats.isDirectory();
    } catch (error) {
        // Handle cases where the path doesn't exist or is inaccessible
        return false;
    }
}


function* walk(path: string): IterableIterator<string> {

    const entries: Dirent[] = readdirSync(path, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath: () => string = () => `${path}/${entry.name}`;

        if (entry.isFile()) {
            yield entryPath();
        }

        if (entry.isDirectory()) {
            yield* walk(entryPath());
        }
    }
}


const handleDir = async (filePath: string): Promise<string | string[]> => {
    ensureFileExists()

    if (!existsSync(filePath)) {
        console.error(`Unable to find image path at ${filePath}`)
        return ''
    }
    const pathes: string[] = []
    for (const path of walk(filePath)) {

        const fileExtension = path.split('.').pop()?.toLowerCase()
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']

        if (!fileExtension || !imageExtensions.includes(fileExtension)) {
            console.error(`File is not a supported image format: ${fileExtension}. Only supports ${imageExtensions.join(', ')}`)
            continue
        }

        const originalName = path.split(/[\\/]/).pop() || ''
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
        const uniqueName = `${sanitizedName}`

        const destinationPath = join(IMAGE_PATH, uniqueName)
        pathes.push(`http://localhost:8891/resource/image/image/${uniqueName}`)
        await copyFile(path, destinationPath)

    }

    return pathes
}

const ensureFileExists = () => {
    if (!existsSync(IMAGE_PATH)) {
        console.debug('Creating images directory');
        mkdir(IMAGE_PATH, { recursive: true });
    }
}


const handleFile = async (filePath: string): Promise<string> => {
    ensureFileExists()

    if (!existsSync(filePath)) {
        console.error(`Unable to find image path at ${filePath}`)
        return ''
    }

    const fileExtension = filePath.split('.').pop()?.toLowerCase()
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']

    if (!fileExtension || !imageExtensions.includes(fileExtension)) {
        console.error(`File is not a supported image format: ${fileExtension}. Only supports ${imageExtensions.join(', ')}`)
        return ''
    }

    const originalName = filePath.split(/[\\/]/).pop() || ''
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueName = `${sanitizedName}`

    const destinationPath = join(IMAGE_PATH, uniqueName)
    await copyFile(filePath, destinationPath)

    return `http://localhost:8891/resource/image/image/${uniqueName}`
}