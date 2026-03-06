'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, AlertTriangle, ArrowLeft, Layers, Users, Heart, BookOpen } from 'lucide-react';
import { useScaffoldingData } from '@/hooks/use-scaffolding-data';
import { toast } from 'sonner';
import type { ParameterSet } from '@/lib/types/bulk-generator.types';

const AVG_COST_PER_CONVERSATION = 0.45;
const AVG_TIME_PER_CONVERSATION = 60;
const CONCURRENCY = 3;
const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000';

export default function WorkbaseGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const { personas, coreArcs, edgeArcs, topics, loading, error } = useScaffoldingData();

  const [category, setCategory] = useState<'core' | 'edge'>('core');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [selectedArcIds, setSelectedArcIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const availableArcs = category === 'core' ? coreArcs : edgeArcs;

  const handleCategoryChange = (newCategory: 'core' | 'edge') => {
    setCategory(newCategory);
    setSelectedArcIds([]);
  };

  const estimate = useMemo(() => {
    const count = selectedPersonaIds.length * selectedArcIds.length * selectedTopicIds.length;
    const effectiveTime = (count / CONCURRENCY) * AVG_TIME_PER_CONVERSATION;
    return {
      conversationCount: count,
      formula: `${selectedPersonaIds.length} persona${selectedPersonaIds.length !== 1 ? 's' : ''} × ${selectedArcIds.length} arc${selectedArcIds.length !== 1 ? 's' : ''} × ${selectedTopicIds.length} topic${selectedTopicIds.length !== 1 ? 's' : ''}`,
      estimatedTimeMinutes: Math.ceil(effectiveTime / 60),
      estimatedCostUSD: count * AVG_COST_PER_CONVERSATION,
    };
  }, [selectedPersonaIds.length, selectedArcIds.length, selectedTopicIds.length]);

  const generateParameterSets = (): ParameterSet[] => {
    const sets: ParameterSet[] = [];
    for (const personaId of selectedPersonaIds) {
      for (const arcId of selectedArcIds) {
        for (const topicId of selectedTopicIds) {
          sets.push({
            templateId: DEFAULT_TEMPLATE_ID,
            parameters: {
              persona_id: personaId,
              emotional_arc_id: arcId,
              training_topic_id: topicId,
            },
            tier: category === 'edge' ? 'edge_case' : 'template',
          });
        }
      }
    }
    return sets;
  };

  const handleSubmit = async () => {
    if (estimate.conversationCount === 0) {
      setSubmitError('Please select at least one persona, arc, and topic');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await fetch('/api/conversations/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${category === 'core' ? 'Core' : 'Edge Case'} Batch — ${new Date().toLocaleString()}`,
          parameterSets: generateParameterSets(),
          concurrentProcessing: CONCURRENCY,
          errorHandling: 'continue',
          workbaseId,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to submit batch');

      toast.success(
        `Batch of ${estimate.conversationCount} conversation${estimate.conversationCount !== 1 ? 's' : ''} submitted — opening batch watcher`
      );
      router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch/${result.jobId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit batch');
      setSubmitting(false);
    }
  };

  const togglePersona = (id: string) =>
    setSelectedPersonaIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const toggleArc = (id: string) =>
    setSelectedArcIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const toggleTopic = (id: string) =>
    setSelectedTopicIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const selectAllPersonas = () =>
    setSelectedPersonaIds(selectedPersonaIds.length === personas.length ? [] : personas.map((p) => p.id));
  const selectAllArcs = () =>
    setSelectedArcIds(selectedArcIds.length === availableArcs.length ? [] : availableArcs.map((a) => a.id));
  const selectAllTopics = () =>
    setSelectedTopicIds(selectedTopicIds.length === topics.length ? [] : topics.map((t) => t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Loading scaffolding data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error loading scaffolding data</p>
        <p className="text-muted-foreground text-sm max-w-md text-center">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Select parameters to generate multiple training conversations for this Work Base.
          </p>
        </div>
      </div>

      {/* Category */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers className="h-5 w-5 text-duck-blue" />
            Conversation Category
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose the type of conversations to generate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={category}
            onValueChange={(v) => handleCategoryChange(v as 'core' | 'edge')}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="core" id="core" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="core" className="font-medium cursor-pointer text-foreground">
                  Core Conversations
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Standard emotional journeys (Confusion → Clarity, Fear → Confidence, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="edge" id="edge" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="edge" className="font-medium cursor-pointer text-foreground">
                  Edge Case Conversations
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Boundary and crisis scenarios (Crisis → Referral, Hostility → Boundary, etc.)
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Personas */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-duck-blue" />
              Personas
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {personas.length} available • {selectedPersonaIds.length} selected
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={selectAllPersonas}>
            {selectedPersonaIds.length === personas.length ? 'Deselect All' : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`persona-${persona.id}`}
                  checked={selectedPersonaIds.includes(persona.id)}
                  onCheckedChange={() => togglePersona(persona.id)}
                />
                <Label htmlFor={`persona-${persona.id}`} className="flex-1 cursor-pointer text-foreground">
                  <span className="font-medium">{persona.name}</span>
                  {persona.archetype && (
                    <span className="text-muted-foreground ml-2 text-sm">— {persona.archetype}</span>
                  )}
                </Label>
              </div>
            ))}
            {personas.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">No personas found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emotional Arcs */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Heart className="h-5 w-5 text-duck-blue" />
              {category === 'core' ? 'Emotional Arcs' : 'Edge Case Arcs'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {availableArcs.length} available • {selectedArcIds.length} selected
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllArcs}
            disabled={availableArcs.length === 0}
          >
            {selectedArcIds.length === availableArcs.length && availableArcs.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableArcs.map((arc) => (
              <div
                key={arc.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`arc-${arc.id}`}
                  checked={selectedArcIds.includes(arc.id)}
                  onCheckedChange={() => toggleArc(arc.id)}
                />
                <Label htmlFor={`arc-${arc.id}`} className="flex-1 cursor-pointer text-foreground">
                  <span className="font-medium">{arc.name}</span>
                  {arc.arc_strategy && (
                    <span className="text-muted-foreground ml-2 text-sm">— {arc.arc_strategy}</span>
                  )}
                </Label>
              </div>
            ))}
            {availableArcs.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No {category === 'core' ? 'core' : 'edge case'} arcs found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Topics */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-duck-blue" />
              Training Topics
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {topics.length} available • {selectedTopicIds.length} selected
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllTopics}
            disabled={topics.length === 0}
          >
            {selectedTopicIds.length === topics.length && topics.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`topic-${topic.id}`}
                  checked={selectedTopicIds.includes(topic.id)}
                  onCheckedChange={() => toggleTopic(topic.id)}
                />
                <Label htmlFor={`topic-${topic.id}`} className="flex-1 cursor-pointer text-sm text-foreground">
                  <span className="font-medium">{topic.name}</span>
                  {topic.category && (
                    <span className="text-muted-foreground block text-xs">{topic.category}</span>
                  )}
                </Label>
              </div>
            ))}
            {topics.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center col-span-2">
                No training topics found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-primary" />
            Batch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conversations to Generate</p>
              <p className="text-4xl font-bold tracking-tight text-foreground">
                {estimate.conversationCount}
              </p>
              <p className="text-xs text-muted-foreground">{estimate.formula}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-xl font-semibold text-foreground">
                  ~{estimate.estimatedTimeMinutes}{' '}
                  {estimate.estimatedTimeMinutes === 1 ? 'minute' : 'minutes'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-semibold text-foreground">
                  ${estimate.estimatedCostUSD.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || estimate.conversationCount === 0}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Batch...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate {estimate.conversationCount} Conversations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
