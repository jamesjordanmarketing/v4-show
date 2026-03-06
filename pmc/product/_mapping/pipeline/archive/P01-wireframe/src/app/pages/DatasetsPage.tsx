import React, { useState, useMemo } from 'react';
import { Search, Filter, SortAsc, Database, Plus } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { DatasetCard } from '../components/datasets/DatasetCard';
import { DatasetDetailModal } from '../components/datasets/DatasetDetailModal';
import {
  mockDatasets,
  filterAndSortDatasets,
  type SortOption,
  type DatasetFilters,
  type Dataset,
} from '../data/datasetMockData';

interface DatasetsPageProps {
  onStartTraining?: (datasetId: string, datasetName: string) => void;
}

export function DatasetsPage({ onStartTraining }: DatasetsPageProps = {}) {
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<DatasetFilters>({
    format: 'all',
    trainingReady: 'all',
    searchQuery: '',
  });
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter and sort datasets
  const filteredDatasets = useMemo(
    () => filterAndSortDatasets(mockDatasets, filters, sortBy),
    [filters, sortBy]
  );

  const handleViewDetails = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsDetailModalOpen(true);
  };

  const handleStartTraining = (dataset: Dataset) => {
    // Navigate to P03 Training Configurator
    if (onStartTraining) {
      onStartTraining(dataset.id, dataset.name);
    } else {
      console.log('Navigate to training configurator with dataset:', dataset.id);
      alert(`Starting training with dataset: ${dataset.name}\n\nIn the full app, this would navigate to the Training Configurator (P03) with dataset_id=${dataset.id}`);
    }
  };

  const handleSearchChange = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFormatFilterChange = (format: 'all' | 'brightrun-lora-v4' | 'brightrun-lora-v3') => {
    setFilters(prev => ({ ...prev, format }));
  };

  const handleReadinessFilterChange = (ready: 'all' | boolean) => {
    setFilters(prev => ({ ...prev, trainingReady: ready }));
  };

  const clearFilters = () => {
    setFilters({
      format: 'all',
      trainingReady: 'all',
      searchQuery: '',
    });
  };

  const activeFilterCount = [
    filters.format !== 'all',
    filters.trainingReady !== 'all',
    filters.searchQuery !== '',
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Datasets</h1>
          <p className="text-muted-foreground">
            Manage your training datasets and prepare them for LoRA fine-tuning
          </p>
        </div>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Dataset
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total Datasets</p>
          <p className="text-2xl font-semibold">{mockDatasets.length}</p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Ready for Training</p>
          <p className="text-2xl font-semibold text-green-600">
            {mockDatasets.filter(d => d.trainingReady).length}
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total Conversations</p>
          <p className="text-2xl font-semibold">
            {mockDatasets.reduce((sum, d) => sum + d.totalConversations, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total Training Pairs</p>
          <p className="text-2xl font-semibold">
            {mockDatasets.reduce((sum, d) => sum + d.totalTrainingPairs, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets by name, consultant, or vertical..."
            className="pl-10"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-48">
            <SortAsc className="size-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="quality-desc">Highest Quality</SelectItem>
            <SelectItem value="quality-asc">Lowest Quality</SelectItem>
            <SelectItem value="size-desc">Most Pairs</SelectItem>
            <SelectItem value="size-asc">Fewest Pairs</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="size-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 size-5 rounded-full p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Format
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.format === 'all'}
              onCheckedChange={() => handleFormatFilterChange('all')}
            >
              All Formats
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.format === 'brightrun-lora-v4'}
              onCheckedChange={() => handleFormatFilterChange('brightrun-lora-v4')}
            >
              v4 Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.format === 'brightrun-lora-v3'}
              onCheckedChange={() => handleFormatFilterChange('brightrun-lora-v3')}
            >
              v3 Only (Legacy)
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Training Ready
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.trainingReady === 'all'}
              onCheckedChange={() => handleReadinessFilterChange('all')}
            >
              All Datasets
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.trainingReady === true}
              onCheckedChange={() => handleReadinessFilterChange(true)}
            >
              Ready Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.trainingReady === false}
              onCheckedChange={() => handleReadinessFilterChange(false)}
            >
              Needs Review
            </DropdownMenuCheckboxItem>

            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.format !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Format: {filters.format}
              <button
                onClick={() => handleFormatFilterChange('all')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.trainingReady !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.trainingReady ? 'Ready Only' : 'Needs Review'}
              <button
                onClick={() => handleReadinessFilterChange('all')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.searchQuery}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredDatasets.length} of {mockDatasets.length} dataset{mockDatasets.length !== 1 ? 's' : ''}
      </div>

      {/* Dataset Grid */}
      {filteredDatasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map(dataset => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onViewDetails={handleViewDetails}
              onStartTraining={handleStartTraining}
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Database className="size-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No datasets found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {activeFilterCount > 0
              ? "No datasets match your current filters. Try adjusting your search criteria."
              : "Get started by creating your first training dataset from conversation data."}
          </p>
          {activeFilterCount > 0 ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button>
              <Plus className="size-4 mr-2" />
              Create Your First Dataset
            </Button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <DatasetDetailModal
        dataset={selectedDataset}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onStartTraining={handleStartTraining}
      />
    </div>
  );
}