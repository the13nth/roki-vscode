'use client';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'name' | 'lastModified' | 'progress';
  onSortChange: (sort: 'name' | 'lastModified' | 'progress') => void;
  filterBy: 'all' | 'active' | 'completed' | 'public';
  onFilterChange: (filter: 'all' | 'active' | 'completed' | 'public') => void;
}

export function SearchAndFilter({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
}: SearchAndFilterProps) {
  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Sort By */}
        <div className="sm:w-48">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'name' | 'lastModified' | 'progress')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="lastModified">Sort by Last Modified</option>
            <option value="name">Sort by Name</option>
            <option value="progress">Sort by Progress</option>
          </select>
        </div>

        {/* Filter By */}
        <div className="sm:w-40">
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value as 'all' | 'active' | 'completed' | 'public')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
    </div>
  );
}