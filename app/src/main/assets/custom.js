window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug

// 这是一个异步函数，因为文件保存操作是异步的
const hookClick = async (e) => {
    const origin = e.target.closest('a');
    if (!origin || !origin.href) {
        return; // 如果点击的不是链接，直接返回
    }

    // --- 核心修改：拦截下载链接并使用原生API保存 ---
    const isDownloadLink = origin.hasAttribute('download') || origin.href.startsWith('blob:');

    if (isDownloadLink) {
        console.log('Download link intercepted, handling with native API.', origin.href);
        // 1. 阻止默认的、会失败的下载行为
        e.preventDefault();
        e.stopPropagation(); // 同时阻止事件冒泡，以防其他脚本干扰

        try {
            // 2. 获取要下载的数据内容
            // 使用 fetch API 读取 blob: URL 的内容
            const response = await fetch(origin.href);
            const data = await response.text(); // 假设是文本文件，如 JSON, CSV, TXT

            // 3. 调用 Tauri 原生保存对话框
            // origin.download 是 <a> 标签上建议的文件名，我们把它作为默认名
            const filePath = await window.__TAURI__.dialog.save({
                defaultPath: origin.download || 'downloaded-file'
            });

            if (filePath) {
                // 4. 如果用户选择了路径 (没有取消), 则调用原生 API 写入文件
                await window.__TAURI__.fs.writeTextFile(filePath, data);
                console.log('File saved successfully to:', filePath);
                // 可以在这里加一个成功的提示，如果你的网页有通知组件的话
            } else {
                console.log('User cancelled the save dialog.');
            }
        } catch (error) {
            console.error('Failed to download file:', error);
            // 可以在此提示用户下载失败
            alert(`文件导出失败: ${error}`);
        }

        return; // 处理完毕，退出函数
    }
    // --- 核心修改结束 ---


    // --- 保留原有逻辑：处理在新窗口打开的链接 ---
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
    if (
        (origin.target === '_blank') || isBaseTargetBlank
    ) {
        e.preventDefault();
        console.log('handle origin _blank link', origin.href);
        location.href = origin.href;
    } else {
        console.log('not handle origin', origin);
    }
};

window.open = function (url, target, features) {
    console.log('window.open intercepted, redirecting to', url);
    location.href = url;
};

// 使用 { capture: true } 确保我们的脚本最先执行
document.addEventListener('click', hookClick, { capture: true });

console.log('Pakeplus custom script with native download handler loaded.');
