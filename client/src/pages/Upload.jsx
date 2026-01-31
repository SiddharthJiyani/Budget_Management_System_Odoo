import { Upload as UploadIcon, FileStack, CloudUpload, ArrowLeft, Trash2, Calendar } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const Upload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [deletingFiles, setDeletingFiles] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all files from database
  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/files/all', {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAllFiles(data.data.files || []);
      } else {
        console.error('Failed to fetch files:', data.message);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (data) => {
    console.log('File uploaded:', data);
    setUploadedFiles(prev => [...prev, data]);
    // Refresh the all files list
    fetchAllFiles();
  };

  const handleDeleteFile = async (file, index, isFromSession = true) => {
    if (!file.publicId) {
      toast.error('Cannot delete file: missing publicId');
      return;
    }

    // Add a loading state for this specific file
    const fileId = isFromSession ? `session-${index}` : `db-${file._id}`;
    setDeletingFiles(prev => new Set([...prev, fileId]));

    try {
      const response = await fetch('http://localhost:4000/api/files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          publicId: file.publicId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete file');
      }

      // Remove from appropriate state
      if (isFromSession) {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      } else {
        setAllFiles(prev => prev.filter(f => f._id !== file._id));
      }

      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      // Remove loading state
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>

          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/30">
              <CloudUpload className="text-primary-foreground" size={32} />
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              File Upload Center
            </h1>

            <p className="text-muted-foreground text-lg">
              Upload your files securely to the cloud. Maximum file size: 10MB
            </p>
          </div>
        </div>

        {/* Upload Component */}
        <div className="max-w-4xl mx-auto">
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Uploaded Files Summary */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-success rounded-xl flex items-center justify-center">
                  <FileStack className="text-success-foreground" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Successfully Uploaded
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <UploadIcon className="text-primary-foreground" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.fileName || `File #${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.format?.toUpperCase() || 'Unknown'} • {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        View
                      </a>

                      <button
                        onClick={() => handleDeleteFile(file, index, true)}
                        disabled={deletingFiles.has(`session-${index}`)}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                        {deletingFiles.has(`session-${index}`) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Files from Database */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <FileStack className="text-primary-foreground" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    All Uploaded Files
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {loading ? 'Loading...' : `${allFiles.length} file${allFiles.length !== 1 ? 's' : ''} in database`}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : allFiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allFiles.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <UploadIcon className="text-primary-foreground" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{file.fileType?.toUpperCase() || 'Unknown'} • {(file.fileSize / 1024).toFixed(0)} KB</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(file.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        View
                      </a>

                      <button
                        onClick={() => handleDeleteFile(file, null, false)}
                        disabled={deletingFiles.has(`db-${file._id}`)}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                        {deletingFiles.has(`db-${file._id}`) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: CloudUpload,
              title: 'Cloud Storage',
              description: 'Files are securely stored on Cloudinary',
              iconBg: 'bg-primary'
            },
            {
              icon: FileStack,
              title: 'Multiple Formats',
              description: 'Support for images, videos, PDFs, and more',
              iconBg: 'bg-accent'
            },
            {
              icon: UploadIcon,
              title: 'Fast Upload',
              description: 'Lightning-fast upload with progress tracking',
              iconBg: 'bg-success'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                <feature.icon className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Upload;
