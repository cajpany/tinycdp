import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { getBackendClient, handleApiError } from '@/lib/api';
import { Download, FileText, Calendar, HardDrive, ExternalLink } from 'lucide-react';

export function Exports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const backend = getBackendClient();

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      try {
        return await backend.exports.listExports({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
  });

  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      try {
        return await backend.admin.listSegments({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
  });

  const exportSegment = useMutation({
    mutationFn: async (key: string) => {
      return await backend.exports.exportSegment({ key });
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast({
        title: 'Success',
        description: `Exported ${data.userCount} users to CSV`,
      });
    },
    onError: handleApiError,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileDate = (filename: string): Date | null => {
    // Extract date from filename like "segment_power_users_2023-12-01.csv"
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? new Date(match[1]) : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exports</h1>
        <p className="text-gray-600 mt-2">
          Export segment data as CSV files for analysis
        </p>
      </div>

      {/* Available Segments to Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Export Segments
          </CardTitle>
          <CardDescription>
            Generate CSV exports for your segments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {segments?.segments && segments.segments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.segments.map((segment) => (
                <div key={segment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{segment.key}</h4>
                    <Badge variant="outline">Segment</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 font-mono">
                    {segment.rule}
                  </p>
                  <Button
                    onClick={() => exportSegment.mutate(segment.key)}
                    disabled={exportSegment.isPending}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No segments available for export. Create segments first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Previous Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Export History
          </CardTitle>
          <CardDescription>
            Previously generated export files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : exports?.exports && exports.exports.length > 0 ? (
            <div className="space-y-4">
              {exports.exports.map((exportFile, index) => {
                const fileDate = getFileDate(exportFile.name);
                return (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-400" />
                        {exportFile.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <HardDrive className="w-4 h-4 mr-1" />
                          {formatFileSize(exportFile.size)}
                        </div>
                        {fileDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {fileDate.toLocaleDateString()}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          CSV
                        </Badge>
                      </div>
                    </div>
                    {exportFile.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exportFile.downloadUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No export files found. Generate your first export above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
