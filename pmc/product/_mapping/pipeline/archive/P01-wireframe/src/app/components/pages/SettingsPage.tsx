import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Settings, Key, Bell, DollarSign, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your LoRA training pipeline
        </p>
      </div>

      <Tabs defaultValue="runpod" className="w-full">
        <TabsList>
          <TabsTrigger value="runpod">
            <Settings className="size-4 mr-2" />
            RunPod
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="size-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="size-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing">
            <DollarSign className="size-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* RunPod Configuration */}
        <TabsContent value="runpod" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>RunPod Configuration</CardTitle>
                  <CardDescription>Configure your RunPod connection settings</CardDescription>
                </div>
                <Badge variant="default">🟢 Connected</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="runpod-api-key">RunPod API Key</Label>
                <Input
                  id="runpod-api-key"
                  type="password"
                  placeholder="Enter your RunPod API key"
                  defaultValue="••••••••••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  Your API key is encrypted and stored securely
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-gpu">Default GPU Type</Label>
                <Input
                  id="default-gpu"
                  placeholder="A100 80GB"
                  defaultValue="A100 80GB"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-scale GPU instances</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically scale based on queue length
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button>
                <Save className="size-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GPU Availability</CardTitle>
              <CardDescription>Current GPU instance availability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">A100 80GB</p>
                    <p className="text-sm text-muted-foreground">$2.49/hour</p>
                  </div>
                  <Badge variant="default">Available</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">A100 40GB</p>
                    <p className="text-sm text-muted-foreground">$1.89/hour</p>
                  </div>
                  <Badge variant="default">Available</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">RTX 4090</p>
                    <p className="text-sm text-muted-foreground">$0.69/hour</p>
                  </div>
                  <Badge variant="secondary">Limited</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys & Secrets</CardTitle>
              <CardDescription>Manage your API keys and authentication tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue="••••••••••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="huggingface-token">Hugging Face Token</Label>
                <Input
                  id="huggingface-token"
                  type="password"
                  placeholder="hf_..."
                  defaultValue="••••••••••••••••"
                />
              </div>

              <Button>
                <Save className="size-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Training Completed</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when training jobs complete
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Training Failed</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when training jobs fail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cost Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when costs exceed threshold
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly activity summaries
                  </p>
                </div>
                <Switch />
              </div>

              <Button>
                <Save className="size-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your billing preferences and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-budget">Monthly Budget Limit</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border border-border rounded-lg bg-muted">
                    $
                  </span>
                  <Input
                    id="monthly-budget"
                    type="number"
                    placeholder="100"
                    defaultValue="100"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Training will pause when this limit is reached
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-top up</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically add credits when balance is low
                  </p>
                </div>
                <Switch />
              </div>

              <Button>
                <Save className="size-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>Your usage for December 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Training costs</span>
                  <span className="font-medium">$38.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Storage costs</span>
                  <span className="font-medium">$5.23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">API costs</span>
                  <span className="font-medium">$3.50</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-bold">$47.23</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
