import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { getBackendClient, handleApiError, apiKeyManager } from '@/lib/api';
import { Plus, Edit, Trash2, Play, AlertCircle, CheckCircle, Download, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SegmentForm {
  key: string;
  rule: string;
}

export function Segments() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [testRule, setTestRule] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState<SegmentForm>({ key: '', rule: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const backend = getBackendClient();
  const hasApiKey = apiKeyManager.hasKey();

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      try {
        return await backend.admin.listSegments({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    enabled: hasApiKey,
  });

  const createSegment = useMutation({
    mutationFn: async (data: SegmentForm) => {
      return await backend.admin.createSegment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setIsCreateOpen(false);
      setForm({ key: '', rule: '' });
      toast({
        title: 'Success',
        description: 'Segment created successfully',
      });
    },
    onError: handleApiError,
  });

  const updateSegment = useMutation({
    mutationFn: async (data: SegmentForm & { originalKey: string }) => {
      return await backend.admin.updateSegment({
        key: data.originalKey,
        rule: data.rule,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setIsEditOpen(false);
      setEditingSegment(null);
      setForm({ key: '', rule: '' });
      toast({
        title: 'Success',
        description: 'Segment updated successfully',
      });
    },
    onError: handleApiError,
  });

  const deleteSegment = useMutation({
    mutationFn: async (key: string) => {
      return await backend.admin.deleteSegment({ key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      toast({
        title: 'Success',
        description: 'Segment deleted successfully',
      });
    },
    onError: handleApiError,
  });

  const validateRule = useMutation({
    mutationFn: async (rule: string) => {
      return await backend.admin.validateExpression({
        expression: rule,
        type: 'segment',
      });
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: handleApiError,
  });

  const exportSegment = useMutation({
    mutationFn: async (key: string) => {
      return await backend.exports.exportSegment({ key });
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
      toast({
        title: 'Success',
        description: `Exported ${data.userCount} users to CSV`,
      });
    },
    onError: handleApiError,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSegment.mutate(form);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSegment) {
      updateSegment.mutate({
        ...form,
        originalKey: editingSegment.key,
      });
    }
  };

  const handleTestRule = () => {
    if (testRule.trim()) {
      validateRule.mutate(testRule);
    }
  };

  const openEdit = (segment: any) => {
    setEditingSegment(segment);
    setForm({
      key: segment.key,
      rule: segment.rule,
    });
    setIsEditOpen(true);
  };

  const openTest = () => {
    setTestRule('');
    setTestResult(null);
    setIsTestOpen(true);
  };

  // Show API key setup message if no key is configured
  if (!hasApiKey) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Segment Definitions</h1>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              To manage segments, please configure your API key first.
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Go to Settings
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Segment Definitions</h1>
          <p className="text-gray-600 mt-2">
            Group users based on their traits and behaviors
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={openTest}>
            <Play className="w-4 h-4 mr-2" />
            Test Rule
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Segment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Segment</DialogTitle>
                <DialogDescription>
                  Define a new segment based on trait conditions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key">Segment Key</Label>
                    <Input
                      id="key"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="e.g., power_users"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule">Rule</Label>
                    <Textarea
                      id="rule"
                      value={form.rule}
                      onChange={(e) => setForm({ ...form, rule: e.target.value })}
                      placeholder="e.g., power_user == true && recent_buyer == true"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Use trait names with boolean operators (==, !=, &&, ||)
                    </p>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSegment.isPending}>
                    Create Segment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rule Tester Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Segment Rule</DialogTitle>
            <DialogDescription>
              Validate segment rule syntax before creating
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-rule">Rule</Label>
              <Textarea
                id="test-rule"
                value={testRule}
                onChange={(e) => setTestRule(e.target.value)}
                placeholder="e.g., power_user == true"
              />
            </div>
            <Button onClick={handleTestRule} disabled={validateRule.isPending}>
              <Play className="w-4 h-4 mr-2" />
              Test Rule
            </Button>
            {testResult && (
              <Alert>
                <div className="flex items-center">
                  {testResult.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="ml-2">
                    {testResult.valid
                      ? 'Rule is valid!'
                      : `Error: ${testResult.error}`}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription>
              Update the segment rule
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-key">Segment Key</Label>
                <Input
                  id="edit-key"
                  value={form.key}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="edit-rule">Rule</Label>
                <Textarea
                  id="edit-rule"
                  value={form.rule}
                  onChange={(e) => setForm({ ...form, rule: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSegment.isPending}>
                Update Segment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Segments List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {segments?.segments.map((segment) => (
            <Card key={segment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {segment.key}
                      <Badge variant="secondary" className="ml-2">
                        Segment
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2 font-mono text-sm">
                      {segment.rule}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportSegment.mutate(segment.key)}
                      disabled={exportSegment.isPending}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(segment)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSegment.mutate(segment.key)}
                      disabled={deleteSegment.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Updated: {new Date(segment.updated_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )) || (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  No segments defined yet. Create your first segment to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
