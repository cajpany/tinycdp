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
import { Plus, Edit, Trash2, Play, AlertCircle, CheckCircle, TestTube } from 'lucide-react';
import { ApiKeyRequired } from '@/components/ApiKeyRequired';

interface FlagForm {
  key: string;
  rule: string;
}

export function Flags() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isDecisionTestOpen, setIsDecisionTestOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<any>(null);
  const [testRule, setTestRule] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testUserId, setTestUserId] = useState('');
  const [testFlagKey, setTestFlagKey] = useState('');
  const [decisionResult, setDecisionResult] = useState<any>(null);
  const [form, setForm] = useState<FlagForm>({ key: '', rule: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const backend = getBackendClient();
  const hasApiKey = apiKeyManager.hasKey();

  const { data: flags, isLoading } = useQuery({
    queryKey: ['flags'],
    queryFn: async () => {
      try {
        return await backend.admin.listFlags({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    enabled: hasApiKey,
  });

  const createFlag = useMutation({
    mutationFn: async (data: FlagForm) => {
      return await backend.admin.createFlag(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      setIsCreateOpen(false);
      setForm({ key: '', rule: '' });
      toast({
        title: 'Success',
        description: 'Flag created successfully',
      });
    },
    onError: handleApiError,
  });

  const updateFlag = useMutation({
    mutationFn: async (data: FlagForm & { originalKey: string }) => {
      return await backend.admin.updateFlag({
        key: data.originalKey,
        rule: data.rule,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      setIsEditOpen(false);
      setEditingFlag(null);
      setForm({ key: '', rule: '' });
      toast({
        title: 'Success',
        description: 'Flag updated successfully',
      });
    },
    onError: handleApiError,
  });

  const deleteFlag = useMutation({
    mutationFn: async (key: string) => {
      return await backend.admin.deleteFlag({ key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      toast({
        title: 'Success',
        description: 'Flag deleted successfully',
      });
    },
    onError: handleApiError,
  });

  const validateRule = useMutation({
    mutationFn: async (rule: string) => {
      return await backend.admin.validateExpression({
        expression: rule,
        type: 'flag',
      });
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: handleApiError,
  });

  const testDecision = useMutation({
    mutationFn: async ({ userId, flag }: { userId: string; flag: string }) => {
      return await backend.decide.decide({ userId, flag });
    },
    onSuccess: (data) => {
      setDecisionResult(data);
    },
    onError: handleApiError,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createFlag.mutate(form);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFlag) {
      updateFlag.mutate({
        ...form,
        originalKey: editingFlag.key,
      });
    }
  };

  const handleTestRule = () => {
    if (testRule.trim()) {
      validateRule.mutate(testRule);
    }
  };

  const handleTestDecision = () => {
    if (testUserId.trim() && testFlagKey.trim()) {
      testDecision.mutate({ userId: testUserId, flag: testFlagKey });
    }
  };

  const openEdit = (flag: any) => {
    setEditingFlag(flag);
    setForm({
      key: flag.key,
      rule: flag.rule,
    });
    setIsEditOpen(true);
  };

  const openTest = () => {
    setTestRule('');
    setTestResult(null);
    setIsTestOpen(true);
  };

  const openDecisionTest = () => {
    setTestUserId('');
    setTestFlagKey('');
    setDecisionResult(null);
    setIsDecisionTestOpen(true);
  };

  if (!hasApiKey) {
    return <ApiKeyRequired pageName="Feature Flags" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-2">
            Control feature access based on segments and traits
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={openDecisionTest}>
            <TestTube className="w-4 h-4 mr-2" />
            Test Decision
          </Button>
          <Button variant="outline" onClick={openTest}>
            <Play className="w-4 h-4 mr-2" />
            Test Rule
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Flag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Flag</DialogTitle>
                <DialogDescription>
                  Define a new feature flag with decision rules
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key">Flag Key</Label>
                    <Input
                      id="key"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="e.g., premium_features"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule">Rule</Label>
                    <Textarea
                      id="rule"
                      value={form.rule}
                      onChange={(e) => setForm({ ...form, rule: e.target.value })}
                      placeholder='e.g., segment("power_users")'
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Use segment("name") or trait("name") functions
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
                  <Button type="submit" disabled={createFlag.isPending}>
                    Create Flag
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
            <DialogTitle>Test Flag Rule</DialogTitle>
            <DialogDescription>
              Validate flag rule syntax before creating
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-rule">Rule</Label>
              <Textarea
                id="test-rule"
                value={testRule}
                onChange={(e) => setTestRule(e.target.value)}
                placeholder='e.g., segment("premium_users")'
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

      {/* Decision Tester Dialog */}
      <Dialog open={isDecisionTestOpen} onOpenChange={setIsDecisionTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Flag Decision</DialogTitle>
            <DialogDescription>
              Test flag decisions for specific users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-user-id">User ID</Label>
              <Input
                id="test-user-id"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Enter user ID to test"
              />
            </div>
            <div>
              <Label htmlFor="test-flag-key">Flag Key</Label>
              <Input
                id="test-flag-key"
                value={testFlagKey}
                onChange={(e) => setTestFlagKey(e.target.value)}
                placeholder="Enter flag key to test"
              />
            </div>
            <Button onClick={handleTestDecision} disabled={testDecision.isPending}>
              <TestTube className="w-4 h-4 mr-2" />
              Test Decision
            </Button>
            {decisionResult && (
              <div className="space-y-2">
                <Alert>
                  <div className="flex items-center">
                    {decisionResult.allow ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className="ml-2">
                      Flag is {decisionResult.allow ? 'ENABLED' : 'DISABLED'} for this user
                    </AlertDescription>
                  </div>
                </Alert>
                <div className="text-sm text-gray-600">
                  <p><strong>Reasons:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    {decisionResult.reasons.map((reason: string, index: number) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDecisionTestOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Flag</DialogTitle>
            <DialogDescription>
              Update the flag rule
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-key">Flag Key</Label>
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
              <Button type="submit" disabled={updateFlag.isPending}>
                Update Flag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Flags List */}
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
          {flags?.flags.map((flag) => (
            <Card key={flag.key}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {flag.key}
                      <Badge variant="secondary" className="ml-2">
                        Flag
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2 font-mono text-sm">
                      {flag.rule}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestFlagKey(flag.key);
                        openDecisionTest();
                      }}
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(flag)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFlag.mutate(flag.key)}
                      disabled={deleteFlag.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )) || (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  No flags defined yet. Create your first flag to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
