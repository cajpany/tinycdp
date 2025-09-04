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
import { getBackendClient, handleApiError } from '@/lib/api';
import { Plus, Edit, Trash2, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface TraitForm {
  key: string;
  expression: string;
}

export function Traits() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [editingTrait, setEditingTrait] = useState<any>(null);
  const [testExpression, setTestExpression] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState<TraitForm>({ key: '', expression: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const backend = getBackendClient();

  const { data: traits, isLoading } = useQuery({
    queryKey: ['traits'],
    queryFn: async () => {
      try {
        return await backend.admin.listTraits({});
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
  });

  const createTrait = useMutation({
    mutationFn: async (data: TraitForm) => {
      return await backend.admin.createTrait(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traits'] });
      setIsCreateOpen(false);
      setForm({ key: '', expression: '' });
      toast({
        title: 'Success',
        description: 'Trait created successfully',
      });
    },
    onError: handleApiError,
  });

  const updateTrait = useMutation({
    mutationFn: async (data: TraitForm & { originalKey: string }) => {
      return await backend.admin.updateTrait({
        key: data.originalKey,
        expression: data.expression,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traits'] });
      setIsEditOpen(false);
      setEditingTrait(null);
      setForm({ key: '', expression: '' });
      toast({
        title: 'Success',
        description: 'Trait updated successfully',
      });
    },
    onError: handleApiError,
  });

  const deleteTrait = useMutation({
    mutationFn: async (key: string) => {
      return await backend.admin.deleteTrait({ key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traits'] });
      toast({
        title: 'Success',
        description: 'Trait deleted successfully',
      });
    },
    onError: handleApiError,
  });

  const validateExpression = useMutation({
    mutationFn: async (expression: string) => {
      return await backend.admin.validateExpression({
        expression,
        type: 'trait',
      });
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: handleApiError,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTrait.mutate(form);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrait) {
      updateTrait.mutate({
        ...form,
        originalKey: editingTrait.key,
      });
    }
  };

  const handleTestExpression = () => {
    if (testExpression.trim()) {
      validateExpression.mutate(testExpression);
    }
  };

  const openEdit = (trait: any) => {
    setEditingTrait(trait);
    setForm({
      key: trait.key,
      expression: trait.expression,
    });
    setIsEditOpen(true);
  };

  const openTest = () => {
    setTestExpression('');
    setTestResult(null);
    setIsTestOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trait Definitions</h1>
          <p className="text-gray-600 mt-2">
            Define user traits based on events and profile data
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={openTest}>
            <Play className="w-4 h-4 mr-2" />
            Test Expression
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Trait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Trait</DialogTitle>
                <DialogDescription>
                  Define a new trait that will be computed for all users
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key">Trait Key</Label>
                    <Input
                      id="key"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="e.g., power_user"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expression">Expression</Label>
                    <Textarea
                      id="expression"
                      value={form.expression}
                      onChange={(e) => setForm({ ...form, expression: e.target.value })}
                      placeholder="e.g., events.app_open.unique_days_14d >= 5"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Use events.&lt;name&gt;.count_7d, profile.&lt;field&gt;, etc.
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
                  <Button type="submit" disabled={createTrait.isPending}>
                    Create Trait
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expression Tester Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Trait Expression</DialogTitle>
            <DialogDescription>
              Validate trait expression syntax before creating
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-expression">Expression</Label>
              <Textarea
                id="test-expression"
                value={testExpression}
                onChange={(e) => setTestExpression(e.target.value)}
                placeholder="e.g., events.purchase.count_30d >= 1"
              />
            </div>
            <Button onClick={handleTestExpression} disabled={validateExpression.isPending}>
              <Play className="w-4 h-4 mr-2" />
              Test Expression
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
                      ? 'Expression is valid!'
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
            <DialogTitle>Edit Trait</DialogTitle>
            <DialogDescription>
              Update the trait expression
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-key">Trait Key</Label>
                <Input
                  id="edit-key"
                  value={form.key}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="edit-expression">Expression</Label>
                <Textarea
                  id="edit-expression"
                  value={form.expression}
                  onChange={(e) => setForm({ ...form, expression: e.target.value })}
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
              <Button type="submit" disabled={updateTrait.isPending}>
                Update Trait
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Traits List */}
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
          {traits?.traits.map((trait) => (
            <Card key={trait.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {trait.key}
                      <Badge variant="secondary" className="ml-2">
                        Trait
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2 font-mono text-sm">
                      {trait.expression}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(trait)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTrait.mutate(trait.key)}
                      disabled={deleteTrait.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Updated: {new Date(trait.updated_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )) || (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  No traits defined yet. Create your first trait to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
