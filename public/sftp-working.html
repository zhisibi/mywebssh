<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>WebSSH - SFTP 文件浏览器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background: #f8f9fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      overflow: hidden;
    }
    
    .container {
      display: flex;
      height: 100vh;
    }
    
    .sidebar {
      width: 300px;
      background: white;
      border-right: 1px solid #e9ecef;
      padding: 20px;
      overflow-y: auto;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white;
    }
    
    .header {
      background: white;
      padding: 16px 24px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .file-browser {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      max-height: calc(100vh - 200px);
    }
    
    .file-table-container {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 8px;
    }
    
    .server-list {
      margin-bottom: 20px;
    }
    
    .server-item {
      padding: 12px 16px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .server-item:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }
    
    .server-item.active {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }
    
    .server-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .server-details {
      font-size: 12px;
      color: #6c757d;
    }
    
    .server-item.active .server-details {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .file-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .file-table th,
    .file-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    
    .file-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    
    .file-table tr:hover {
      background: #f8f9ff;
    }
    
    .file-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    .file-name {
      font-weight: 500;
      cursor: pointer;
    }
    
    .file-name:hover {
      color: #667eea;
      text-decoration: underline;
    }
    
    .file-size {
      color: #6c757d;
      font-size: 14px;
    }
    
    .file-type {
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .file-type.directory {
      background: #667eea;
      color: white;
    }
    
    .breadcrumb {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      background: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .breadcrumb-item {
      color: #667eea;
      cursor: pointer;
    }
    
    .breadcrumb-item:hover {
      text-decoration: underline;
    }
    
    .breadcrumb-separator {
      margin: 0 8px;
      color: #6c757d;
    }
    
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .btn-primary:hover {
      background: #5a67d8;
    }
    
    .btn-download {
      background: #48bb78;
      color: white;
      border-color: #48bb78;
    }
    
    .btn-download:hover {
      background: #38a169;
      border-color: #38a169;
    }
    
    .btn-close {
      background: #e53e3e;
      color: white;
      border-color: #e53e3e;
    }
    
    .btn-close:hover {
      background: #c53030;
      border-color: #c53030;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }
    
    .error {
      background: #fff5f5;
      color: #e53e3e;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="main-content" style="margin-left: 0;">
    <div class="header">
      <div class="breadcrumb" id="breadcrumb">
        <span class="breadcrumb-item" onclick="navigateTo('/')">根目录</span>
      </div>
      <div class="toolbar">
        <button class="btn" onclick="uploadFile()">📤 上传</button>
        <button class="btn" onclick="createFolder()">📁 新建文件夹</button>
        <button class="btn" onclick="downloadFile()">📥 下载</button>
        <button class="btn btn-primary" onclick="refreshList()">🔄 刷新</button>
        <button class="btn" onclick="goBack()" id="backBtn" style="display: none;">↩️ 返回服务器列表</button>
        <button class="btn btn-close" onclick="closeWindow()">❌ 关闭</button>
      </div>
    </div>
    
    <div class="file-browser">
      <div id="fileList">
        <div class="loading" id="loadingState">
          <div>正在加载文件列表...</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentServer = null;
    let currentPath = '/';

    // 从URL参数获取服务器ID
    const urlParams = new URLSearchParams(window.location.search);
    const serverId = urlParams.get('server');

    // 初始化
    async function init() {
      if (serverId) {
        // 直接从URL参数加载指定服务器
        await loadServerById(serverId);
        document.getElementById('backBtn').style.display = 'block';
      } else {
        // 没有服务器参数，显示服务器列表
        await loadServers();
      }
    }

    // 加载指定服务器
    async function loadServerById(serverId) {
      try {
        const response = await fetch('/api/servers');
        const servers = await response.json();
        const server = servers.find(s => s.id == serverId);
        
        if (server) {
          currentServer = server;
          currentPath = '/';
          updateBreadcrumb();
          await loadFileList();
        } else {
          document.getElementById('fileList').innerHTML = 
            '<div class="error">服务器不存在或已被删除</div>';
        }
      } catch (error) {
        document.getElementById('fileList').innerHTML = 
          '<div class="error">加载服务器失败: ' + error.message + '</div>';
      }
    }

    // 加载服务器列表（备用）
    async function loadServers() {
      try {
        const response = await fetch('/api/servers');
        const servers = await response.json();
        
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        servers.forEach(server => {
          const serverItem = document.createElement('div');
          serverItem.className = 'server-item';
          serverItem.onclick = () => selectServer(server);
          
          serverItem.innerHTML = `
            <div class="server-name">${server.name}</div>
            <div class="server-details">${server.username}@${server.host}:${server.port}</div>
          `;
          
          fileList.appendChild(serverItem);
        });
        
      } catch (error) {
        document.getElementById('fileList').innerHTML = 
          '<div class="error">加载服务器列表失败</div>';
      }
    }

    async function selectServer(server) {
      currentServer = server;
      currentPath = '/';
      
      updateBreadcrumb();
      await loadFileList();
      document.getElementById('backBtn').style.display = 'block';
    }

    async function loadFileList() {
      if (!currentServer) return;
      
      const fileList = document.getElementById('fileList');
      fileList.innerHTML = '<div class="loading">加载文件列表...</div>';
      
      try {
        const response = await fetch(`/api/sftp/list?serverId=${currentServer.id}&path=${encodeURIComponent(currentPath)}`);
        const result = await response.json();
        
        if (result.success) {
          displayFileList(result.files);
        } else {
          fileList.innerHTML = `<div class="error">加载失败: ${result.message}</div>`;
        }
      } catch (error) {
        fileList.innerHTML = `<div class="error">网络错误: ${error.message}</div>`;
      }
    }


	    function displayFileList(files) {
	  const fileList = document.getElementById('fileList');
	  
	  if (files.length === 0) {
	    fileList.innerHTML = '<div class="loading">目录为空</div>';
	    return;
	  }
	  
	  fileList.innerHTML = `
	    <div class="file-table-container">
	      <table class="file-table">
	        <thead>
	          <tr>
	            <th><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this.checked)"> 名称</th>
	            <th>类型</th>
	            <th>大小</th>
	            <th>修改时间</th>
	          </tr>
	        </thead>
	        <tbody>
	          ${files.map(file => {
	            // 文件类型兜底判断
	            const ext = file.name.toLowerCase().split('.').pop();
	            const looksLikeFile = ['txt','log','md','pdf','doc','docx','xls','xlsx','ppt','pptx',
	                                 'png','jpg','jpeg','gif','zip','rar','7z','tar','gz','mp4','mp3',
	                                 'html','css','js','json','xml','yml','yaml','ini','conf','sh','bat',
	                                 'mov','avi','wmv','flv','webm','m4a','wav','ogg','flac','aac']
	              .includes(ext);
	            const isDir = (file.type === 'directory') && !looksLikeFile;
	            
	            const icon = isDir ? '📁' : (file.type === 'link' ? '🔗' : '📄');
	            const typeText = isDir ? '目录' : '文件';
	            const sizeText = isDir ? '-' : formatFileSize(file.size);
	            
	            const filePath = currentPath === '/' 
	              ? '/' + file.name 
	              : currentPath + '/' + file.name;
	            
	            return `
	              <tr>
	                <td>
	                  <input type="checkbox" class="file-checkbox" data-path="${filePath}" style="margin-right: 8px;" ${isDir ? 'disabled' : ''}>
	                  <div class="file-name" onclick="handleFileClick('${file.name}', ${isDir})" oncontextmenu="showFileMenu(event, '${file.name}', ${isDir})">
	                    ${icon} ${file.name}
	                  </div>
	                </td>
	                <td>
	                  <span class="file-type ${isDir ? 'directory' : 'file'}">
	                    ${typeText}
	                  </span>
	                </td>
	                <td class="file-size">
	                  ${sizeText}
	                </td>
	                <td class="file-size">
	                  ${new Date(file.mtime * 1000).toLocaleString()}
	                </td>
	              </tr>
	            `;
	          }).join('')}
	        </tbody>
	      </table>
	    </div>
	  `;
	}


//    function handleFileClick(filename, isDirectory = false) {
//      if (filename === '..') {
//        // 返回上级目录
//        const pathParts = currentPath.split('/').filter(p => p);
//        pathParts.pop();
//        currentPath = '/' + pathParts.join('/');
//      } else if (isDirectory) {
//        // 进入子目录
//        currentPath = currentPath === '/' ? 
//          '/' + filename : 
//          currentPath + '/' + filename;
//      } else {
//        // 文件点击 - 直接下载文件
//        downloadFile(filename);
//        return;
//      }
//      
//      updateBreadcrumb();
//      loadFileList();
//    }
	function handleFileClick(filename, isDirectory = false) {
	  console.log('handleFileClick called:', filename, 'isDirectory:', isDirectory);
	  
	  if (filename === '..') {
	    // 返回上级目录
	    const pathParts = currentPath.split('/').filter(p => p);
	    pathParts.pop();
	    currentPath = '/' + pathParts.join('/');
	    updateBreadcrumb();
	    loadFileList();
	    return;
	  }
	
	  if (isDirectory) {
	    console.log('Entering directory:', filename);
	    // 进入子目录
	    currentPath = currentPath === '/'
	      ? '/' + filename
	      : currentPath + '/' + filename;
	    updateBreadcrumb();
	    loadFileList();
	  } else {
	    console.log('Downloading file:', filename);
	    // 文件：直接下载，不再调用 loadFileList()
	    downloadFile(filename);
	  }
	}



    function updateBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumb');
      breadcrumb.innerHTML = '<span class="breadcrumb-item" onclick="navigateTo(\'/\')">根目录</span>';
      
      if (currentPath !== '/') {
        const parts = currentPath.split('/').filter(p => p);
        let path = '';
        
        parts.forEach((part, index) => {
          path += '/' + part;
          breadcrumb.innerHTML += `
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item" onclick="navigateTo('${path}')">${part}</span>
          `;
        });
      }
    }

    function navigateTo(path) {
      currentPath = path;
      updateBreadcrumb();
      loadFileList();
    }

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
 //新加



  // 打包下载文件或目录为 ZIP
  function downloadAsZip(targetPath) {
    if (!currentServer) {
      alert('请先选择一个服务器');
      return;
    }

    fetch('/api/sftp/download-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serverId: currentServer.id,
        paths: [targetPath]   // 后端是支持多个，这里只传一个目录或文件
      })
    })
    .then(response => {
      if (!response.ok) {
        // 尝试解析后端返回的 JSON 错误信息
        return response.json()
          .then(err => { throw new Error(err.message || ('HTTP ' + response.status)); })
          .catch(() => { throw new Error('下载失败，HTTP 状态: ' + response.status); });
      }
      return response.blob();
    })
    .then(blob => {
      // 构造下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // 从路径中取一个名字当 zip 文件名
      const parts = targetPath.split('/').filter(Boolean);
      const baseName = parts.length ? parts[parts.length - 1] : 'download';

      a.href = url;
      a.download = baseName + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('打包下载失败:', err);
      alert('打包下载失败: ' + err.message);
    });
  }

  // 新加

   

    async function uploadFile() {
      if (!currentServer) {
        alert('请先选择一个服务器');
        return;
      }
      
      // 创建文件选择输入
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        try {
          for (const file of files) {
            const content = await readFileAsBase64(file);
            
            const response = await fetch('/api/sftp/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                serverId: currentServer.id,
                path: currentPath,
                filename: file.name,
                content: content
              })
            });
            
            const result = await response.json();
            if (!result.success) {
              alert(`上传文件 ${file.name} 失败: ${result.message}`);
              return;
            }
          }
          
          alert('文件上传成功！');
          refreshList();
          
        } catch (error) {
          console.error('上传文件错误:', error);
          alert('上传文件失败，请检查网络连接');
        }
      };
      input.click();
    }

    // 读取文件为Base64
    function readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result.split(',')[1]); // 移除 data:application/octet-stream;base64, 前缀
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function createFolder() {
      if (!currentServer) {
        alert('请先选择一个服务器');
        return;
      }
      
      const folderName = prompt('请输入文件夹名称：');
      if (!folderName) return;
      
      try {
        const response = await fetch('/api/sftp/mkdir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            serverId: currentServer.id,
            path: currentPath,
            dirname: folderName
          })
        });
        
        const result = await response.json();
        if (result.success) {
          alert('文件夹创建成功！');
          refreshList();
        } else {
          alert(`创建文件夹失败: ${result.message}`);
        }
        
      } catch (error) {
        console.error('创建文件夹错误:', error);
        alert('创建文件夹失败，请检查网络连接');
      }
    }

    let selectedFile = null;
//
//    function downloadFile(filename = null) {
//      const fileToDownload = filename || selectedFile;
//      
//      if (!fileToDownload) {
//        alert('请先选择要下载的文件');
//        return;
//      }
//      
//      if (!currentServer) {
//        alert('请先选择一个服务器');
//        return;
//      }
//
//      const filePath = currentPath === '/' ? 
//        `/${fileToDownload}` : 
//        `${currentPath}/${fileToDownload}`;
//
//      // 直接下载文件
//      const downloadUrl = `/api/sftp/download?serverId=${currentServer.id}&path=${encodeURIComponent(filePath)}`;
//      
//      // 创建隐藏的链接进行下载
//      const link = document.createElement('a');
//      link.href = downloadUrl;
//      link.download = fileToDownload;
//      document.body.appendChild(link);
//      link.click();
//      document.body.removeChild(link);
//    }
//改
function downloadFile(filename = null) {
  const fileToDownload = filename || selectedFile;
  
  if (!fileToDownload) {
    alert('请先选择要下载的文件');
    return;
  }
  
  if (!currentServer) {
    alert('请先选择一个服务器');
    return;
  }

  const filePath = currentPath === '/'
    ? '/' + fileToDownload
    : currentPath + '/' + fileToDownload;

  const downloadUrl = `/api/sftp/download?serverId=${currentServer.id}&path=${encodeURIComponent(filePath)}`;

  // 用隐藏 a 标签触发下载
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileToDownload;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
//改

//    function showFileMenu(event, filename, isDirectory) {
//      event.preventDefault();
//      selectedFile = filename;
//      
//      // 创建简单的右键菜单
//      const menu = document.createElement('div');
//      menu.style.position = 'absolute';
//      menu.style.left = event.pageX + 'px';
//      menu.style.top = event.pageY + 'px';
//      menu.style.background = 'white';
//      menu.style.border = '1px solid #ccc';
//      menu.style.padding = '5px';
//      menu.style.borderRadius = '4px';
//      menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
//      menu.style.zIndex = '1000';
//      
//      menu.innerHTML = `
//        <div style="padding: 5px; cursor: pointer;" onclick="downloadFile()">📥 下载</div>
//        ${isDirectory ? '' : '<div style="padding: 5px; cursor: pointer;" onclick="deleteSelectedFile()">🗑️ 删除</div>'}
//      `;
//      
//      document.body.appendChild(menu);
//      
//      // 点击其他地方关闭菜单
//      const closeMenu = () => {
//        document.body.removeChild(menu);
//        document.removeEventListener('click', closeMenu);
//      };
//      
//      setTimeout(() => {
//        document.addEventListener('click', closeMenu);
//      }, 100);
//    }
//新加
function showFileMenu(event, filename, isDirectory) {
  event.preventDefault();
  selectedFile = filename;

  // 计算完整路径
  const filePath = currentPath === '/'
    ? '/' + filename
    : currentPath + '/' + filename;
  
  // 创建右键菜单
  const menu = document.createElement('div');
  menu.style.position = 'absolute';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
  menu.style.background = 'white';
  menu.style.border = '1px solid #ccc';
  menu.style.padding = '5px';
  menu.style.borderRadius = '4px';
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  menu.style.zIndex = '1000';
  
  let html = '';

  if (isDirectory) {
    // 目录：提供“打包下载”
    html += `
      <div style="padding: 5px; cursor: pointer;" onclick="downloadAsZip('${filePath}')">
        📦 打包下载为ZIP
      </div>
    `;
  } else {
    // 文件：保持原来的“下载”和“删除”
    html += `
      <div style="padding: 5px; cursor: pointer;" onclick="downloadFile('${filename}')">
        📥 下载
      </div>
      <div style="padding: 5px; cursor: pointer;" onclick="deleteSelectedFile()">
        🗑️ 删除
</div>
    `;
  }

  menu.innerHTML = html;
  document.body.appendChild(menu);
  
  // 点击其他地方关闭菜单
  const closeMenu = () => {
    if (menu.parentNode) {
      document.body.removeChild(menu);
    }
    document.removeEventListener('click', closeMenu);
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}
//新加



    function deleteSelectedFile() {
      if (!selectedFile) return;
      
      if (!confirm(`确定要删除文件 "${selectedFile}" 吗？此操作不可恢复。`)) {
        return;
      }
      
      const filePath = currentPath === '/' ? 
        `/${selectedFile}` : 
        `${currentPath}/${selectedFile}`;

      fetch('/api/sftp/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId: currentServer.id,
          path: filePath,
          isDirectory: false
        })
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          alert('文件删除成功');
          refreshList();
        } else {
          alert('删除文件失败: ' + result.message);
        }
      })
      .catch(error => {
        console.error('删除文件错误:', error);
        alert('网络错误，请重试');
      });
    }

    function refreshList() {
      if (currentServer) {
        loadFileList();
      }
    }

    function goBack() {
      currentServer = null;
      currentPath = '/';
      document.getElementById('backBtn').style.display = 'none';
      document.getElementById('breadcrumb').innerHTML = '<span class="breadcrumb-item" onclick="navigateTo(\'/\')">根目录</span>';
      loadServers();
    }

    function closeWindow() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }

    // 初始化
    init();
  </script>
</body>
</html>