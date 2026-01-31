import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, XCircle, FileText, FileVideo, FileImage, File } from 'lucide-react';
import toast from 'react-hot-toast';

const FileUpload = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'application/pdf', 'text/plain', 'application/javascript', 'text/typescript'];

  // Get file icon based on file type
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <FileImage className="text-primary" size={24} />;
    if (type.startsWith('video/')) return <FileVideo className="text-success" size={24} />;
    if (type === 'application/pdf') return <FileText className="text-destructive" size={24} />;
    return <File className="text-muted-foreground" size={24} />;
  };

  // Get file extension badge color
  const getFileExtensionColor = (type) => {
    if (type.startsWith('image/')) return 'bg-primary';
    if (type.startsWith('video/')) return 'bg-success';
    if (type === 'application/pdf') return 'bg-destructive';
    return 'bg-muted';
  };

  // Get file extension label
  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop().toUpperCase();
    return ext.length > 4 ? ext.substring(0, 3) : ext;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Validate file
  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(svg|png|jpg|jpeg|gif|mp4|pdf|ts|js)$/i)) {
      return { valid: false, error: 'File type not supported' };
    }
    return { valid: true };
  };

  // Handle file selection
  const handleFiles = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);

    fileArray.forEach(file => {
      const validation = validateFile(file);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      const fileId = Date.now() + Math.random();
      const newFile = {
        id: fileId,
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading', // uploading, complete, failed
        progress: 0,
        error: null
      };

      setFiles(prev => [...prev, newFile]);
      uploadToCloudinary(newFile);
    });
  };

  // Upload to Cloudinary
  const uploadToCloudinary = async (fileData) => {
    try {
      const formData = new FormData();
      formData.append('file', fileData.file);

      // Simulate progress (you can replace this with actual progress tracking)
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f =>
          f.id === fileData.id && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ));
      }, 200);

      // Make the actual upload request to your backend
      const response = await fetch('http://localhost:4000/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update file status to complete
      setFiles(prev => prev.map(f =>
        f.id === fileData.id
          ? { ...f, status: 'complete', progress: 100, url: data.data.url }
          : f
      ));

      toast.success(`${fileData.name} uploaded successfully!`);

      if (onUploadComplete) {
        onUploadComplete(data.data);
      }
    } catch (error) {
      console.error('Upload error:', error);

      // Update file status to failed
      setFiles(prev => prev.map(f =>
        f.id === fileData.id
          ? { ...f, status: 'failed', error: error.message }
          : f
      ));

      toast.error(`Failed to upload ${fileData.name}`);
    }
  };

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  // Handle file input change
  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Remove file
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Retry upload
  const retryUpload = (fileData) => {
    setFiles(prev => prev.map(f =>
      f.id === fileData.id
        ? { ...f, status: 'uploading', progress: 0, error: null }
        : f
    ));
    uploadToCloudinary(fileData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .file-item {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .progress-bar {
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .drag-active {
          transform: scale(1.01);
        }
      `}</style>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'drag-active border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 bg-card'
          }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleInputChange}
          accept=".svg,.png,.jpg,.jpeg,.gif,.mp4,.pdf,.ts,.js"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging
              ? 'bg-primary/10 scale-110'
              : 'bg-muted'
            }`}
          >
            <Upload className={`transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} size={28} />
          </div>

          <div>
            <p className="text-base sm:text-lg font-medium text-foreground">
              <span className="text-primary hover:text-primary/80 transition-colors">
                Click to upload
              </span>
              {' '}or drag and drop
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              SVG, PNG, JPG or GIF (max. 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((fileData, index) => (
            <div
              key={fileData.id}
              className={`file-item relative p-4 rounded-2xl border transition-all duration-300
                ${fileData.status === 'failed'
                  ? 'border-destructive bg-destructive/5'
                  : 'border-border bg-card'
                }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                {/* File Icon */}
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                  ${fileData.status === 'failed' ? 'bg-destructive/10' : 'bg-muted'}`}
                >
                  <div className="relative">
                    {getFileIcon(fileData.type)}
                    <div className={`absolute -top-1 -right-1 ${getFileExtensionColor(fileData.type)} text-white text-[8px] font-bold px-1 rounded`}>
                      {getFileExtension(fileData.name)}
                    </div>
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {fileData.name}
                    </h4>
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(fileData.size)}
                    </span>

                    {/* Status */}
                    {fileData.status === 'uploading' && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Upload size={12} className="animate-bounce" />
                        Uploading...
                      </span>
                    )}
                    {fileData.status === 'complete' && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle size={14} />
                        Complete
                      </span>
                    )}
                    {fileData.status === 'failed' && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XCircle size={14} />
                        Failed
                      </span>
                    )}

                    {/* Progress percentage */}
                    {(fileData.status === 'uploading' || fileData.status === 'complete') && (
                      <span className="ml-auto text-xs font-medium text-foreground">
                        {fileData.progress}%
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(fileData.status === 'uploading' || fileData.status === 'complete') && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`progress-bar h-full rounded-full transition-all duration-300
                          ${fileData.status === 'complete'
                            ? 'bg-success'
                            : 'bg-primary'
                          }`}
                        style={{ width: `${fileData.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Retry Button */}
                  {fileData.status === 'failed' && (
                    <button
                      onClick={() => retryUpload(fileData)}
                      className="mt-2 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
