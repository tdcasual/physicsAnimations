const fs = require('fs');
const path = require('path');

// --- 1. 分类名称映射 ---
// 在这里定义您的文件夹名和中文名的对应关系
const categoryMap = {
    'mechanics': '力学',
    'thermodynamics': '热学',
    'electromagnetism': '电磁学',
    'waves': '振动与波',
    'optics': '光学',
    'modern': '近代物理',
    'other': '其他'
    // 您可以在此添加更多分类
};

// --- 2. 路径定义 ---
const animationsDir = path.join(__dirname, 'animations');
const outputJson = path.join(__dirname, 'animations.json');

// (修改) 定义 thumbnails 目录的绝对路径和相对路径
const thumbnailBaseAbsDir = path.join(animationsDir, 'thumbnails'); // 绝对路径，用于创建目录
const thumbnailBaseWebPath = 'animations/thumbnails'; // 相对 Web 路径，用于 JSON 输出

// --- 3. 辅助函数：首字母大写 ---
function capitalize(s) {
    if (typeof s !== 'string' || s.length === 0) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- 4. 辅助函数：确保目录存在 ---
function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true }); // recursive: true 可以创建多层目录
        console.log(`[Init] 成功创建目录: ${dirPath}`);
    }
}

// --- 5. 主扫描逻辑 ---
try {
    const finalData = {};

    // --- NEW (V3): 确保根目录存在 ---
    ensureDirExists(animationsDir);
    ensureDirExists(thumbnailBaseAbsDir);

    // --- NEW (V3): 遍历 categoryMap，主动创建缺失的文件夹 ---
    console.log("正在检查并初始化标准分类目录...");
    for (const categoryId in categoryMap) {
        const categoryPath = path.join(animationsDir, categoryId);
        const thumbnailCategoryPath = path.join(thumbnailBaseAbsDir, categoryId);
        
        // 确保每个分类的动画目录和缩略图目录都存在
        ensureDirExists(categoryPath);
        ensureDirExists(thumbnailCategoryPath);
    }
    console.log("目录初始化检查完成。");

    // --- 6. (不变) 扫描 animations 目录下的所有子目录 ---
    const categoryFolders = fs.readdirSync(animationsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name !== 'thumbnails'); // 过滤出文件夹，并排除 thumbnails 目录

    // 遍历每个找到的分类文件夹
    for (const folder of categoryFolders) {
        const categoryId = folder.name;
        
        // (不变) 优先用映射的中文名，否则自动大写
        const categoryTitle = categoryMap[categoryId] || capitalize(categoryId); 
        
        const categoryPath = path.join(animationsDir, categoryId);
        const thumbnailCategoryAbsPath = path.join(thumbnailBaseAbsDir, categoryId); // 缩略图文件夹的绝对路径

        // 读取该分类文件夹下的所有 .html 文件
        const files = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.html'));

        const items = files.map(file => {
            const baseName = file.replace('.html', '');
            const fileRelativePath = `${categoryId}/${file}`; // e.g., "mechanics/projectile.html"
            
            // e.g., "animations/thumbnails/mechanics/projectile.png"
            const thumbnailRelativePath = `${thumbnailBaseWebPath}/${categoryId}/${baseName}.png`;
            // e.g., ".../project/animations/thumbnails/mechanics/projectile.png"
            const thumbnailAbsolutePath = path.join(thumbnailCategoryAbsPath, `${baseName}.png`);

            return {
                file: fileRelativePath,
                title: capitalize(baseName), 
                description: "点击查看详情...", 
                thumbnail: fs.existsSync(thumbnailAbsolutePath) ? thumbnailRelativePath : "" 
            };
        });

        // (修改 V3) 即使分类为空，也将其添加到 JSON 中
        // 这样前端页面会显示一个空的分类，符合"初始化"的预期
        finalData[categoryId] = {
            title: categoryTitle,
            items: items
        };
    }

    // 7. 写入 JSON 文件
    fs.writeFileSync(outputJson, JSON.stringify(finalData, null, 2));

    console.log(`成功更新 animations.json！共处理 ${Object.keys(finalData).length} 个分类。`);

} catch (error) {
    console.error('生成 animations.json 时出错:', error);
}
