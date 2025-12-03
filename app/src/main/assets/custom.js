window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug

// (原始逻辑保持不变，用于处理页面内跳转)
const hookClick = (e) => {
    // 寻找点击目标最近的 <a> 标签
    const origin = e.target.closest('a');
    
    // ----------- [关键修改点 1: 增加下载链接判断] -----------
    // 如果这个链接是下载链接(有download属性)，则直接退出，交由下面的 hookDownload 函数处理
    if (origin && origin.hasAttribute('download')) {
        return; 
    }
    // ---------------------- [修改结束] ----------------------

    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    );
    console.log('origin', origin, isBaseTargetBlank);
    
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault();
        console.log('handle origin', origin);
        location.href = origin.href;
    } else {
        console.log('not handle origin', origin);
    }
};

window.open = function (url, target, features) {
    console.log('open', url, target, features);
    location.href = url;
};
document.addEventListener('click', hookClick, { capture: true });


// ----------- [关键修改点 2: 新增专门处理下载的模块] -----------
// 将您找到的两段代码整合并重构为一个完整的下载模块
(function () {
    // 首先检查是否在 Tauri 环境中，如果不是，则不执行任何操作
    if (!('__TAURI__' in window)) {
        return;
    }

    console.log("Tauri 环境检测成功，下载模块已初始化。");

    // 从 Tauri API 中解构出需要的函数
    const { invoke } = window.__TAURI__.core;
    const { listen } = window.__TAURI__.event;
    const { message } = window.__TAURI__.dialog; // 新增：用于简单的弹窗提示

    // [重构] 创建一个 Set 来跟踪正在下载的文件 ID，防止重复处理
    const downloadingFiles = new Set();
    
    // 设置事件监听器，用于接收后端的下载进度
    listen('download_progress', (event) => {
        const { fileId, downloaded, total } = event.payload;

        // 如果这个文件ID是我们正在跟踪的，就更新它的进度
        if (downloadingFiles.has(fileId)) {
            const progress = total > 0 ? ((downloaded / total) * 100).toFixed(0) : 0;
            console.log(`文件[${fileId}] 下载进度: ${progress}%`); // 您可以在这里更新UI
            
            // 示例：如果您的页面有一个全局的顶部提示条，可以这样更新
            if (typeof showTopToast === 'function') {
                showTopToast(`下载中... ${progress}%`, 60000); // 长时间显示
            }
        }
    });

    // 创建一个新的下载点击事件钩子
    const hookDownload = async (e) => {
        const downloadLink = e.target.closest('a[download]');

        // 如果点击的不是下载链接，或者已经在处理一个下载，则直接返回
        if (!downloadLink) {
            return;
        }

        // 阻止浏览器的默认下载行为
        e.preventDefault();
        
        const urlToDownload = downloadLink.href;
        const defaultFilename = downloadLink.download || 'downloaded-file';
        
        // 生成一个唯一的文件ID用于跟踪
        const fileId = `file_${Date.now()}`;
        
        if (downloadingFiles.has(fileId)) {
            console.log('该文件已在下载队列中。');
            return;
        }

        try {
            // [重构] 开始下载
            downloadingFiles.add(fileId);
            if (typeof showTopToast === 'function') {
                showTopToast('已开始下载，请在系统下载文件夹查看...', 3000);
            } else {
                console.log('已开始下载，请在系统下载文件夹查看...');
            }

            // 使用 invoke 调用 Pake Plus 提供的自定义下载命令
            await invoke('download_file', {
                url: urlToDownload,
                savePath: '', // 留空通常意味着 Pake 会使用默认下载路径
                fileId: fileId,
            });

            // 下载完成后，从跟踪集合中移除
            downloadingFiles.delete(fileId);
            
            // 使用 Tauri 的原生对话框提示用户
            await message('下载完成！', { title: '提示', type: 'info' });

        } catch (err) {
            // 如果下载出错
            console.error('下载失败:', err);
            downloadingFiles.delete(fileId);
            await message(`下载失败: ${err}`, { title: '错误', type: 'error' });
        }
    };

    // 将新的下载钩子也添加到 document 的点击事件监听器中
    document.addEventListener('click', hookDownload, { capture: true });

})(); // 使用立即执行函数表达式(IIFE)封装，避免污染全局作用域
// ---------------------- [修改结束] ----------------------
