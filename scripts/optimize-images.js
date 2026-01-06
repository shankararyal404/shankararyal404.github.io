import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const targets = [
    { file: 'assets/images/Shankararyal1.avif', width: 800 },
    { file: 'assets/images/certificates/industrial-control-system.avif', width: 800 },
    { file: 'assets/images/shankararyal.jpg', width: 600 },
    { file: 'assets/images/Shankararyal2.avif', width: 400 },
    { file: 'assets/images/certificates/legacy-responsive-web-design-v8.avif', width: 800 },
    { file: 'assets/images/certificates/college-algebra-with-python.avif', width: 800 },
    { file: 'assets/images/certificates/matlab-and-latex.avif', width: 800 },
    { file: 'assets/images/certificates/attack-methodologies-in-it-ics.avif', width: 800 },
];

(async () => {
    for (const target of targets) {
        const filePath = path.join(process.cwd(), target.file);
        if (fs.existsSync(filePath)) {
            try {
                const metadata = await sharp(filePath).metadata();
                if (metadata.width > target.width) {
                    console.log(`Resizing ${target.file} from ${metadata.width} to ${target.width}...`);
                    const buffer = await sharp(filePath)
                        .resize({ width: target.width })
                        .toBuffer();
                    fs.writeFileSync(filePath, buffer);
                    console.log(`Done.`);
                } else {
                    console.log(`Skipping ${target.file} (width ${metadata.width} <= ${target.width})`);
                }
            } catch (e) {
                console.error(`Error processing ${target.file}:`, e.message);
            }
        } else {
            console.warn(`File not found: ${target.file}`);
        }
    }
})();
