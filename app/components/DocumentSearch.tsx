"use client"

import { useState } from 'react'
import { Search } from 'lucide-react'

interface SearchResult {
  id: string
  pageContent: string
  metadata: {
    title?: string
    user_id: string
    [key: string]: any
  }
}

export default function DocumentSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) return
    
    setIsSearching(true)
    setError('')
    
    try {
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5 })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Error searching documents')
      }
      
      setResults(data.results)
    } catch (err) {
      console.error('Error searching documents:', err)
      setError('Failed to search documents. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents..."
            className="w-full p-3 pl-10 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-blue-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="p-4 mb-4 bg-red-900/30 border border-red-900 rounded-lg text-sm text-red-200">
          {error}
        </div>
      )}
      
      {results.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-white mb-3">Search Results</h3>
          {results.map((result, index) => (
            <div 
              key={`${result.id}-${index}`} 
              className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg"
            >
              <h4 className="font-medium text-blue-400 mb-2">
                {result.metadata.title || 'Document'}
              </h4>
              <p className="text-sm text-zinc-300">
                {result.pageContent.length > 200 
                  ? `${result.pageContent.substring(0, 200)}...` 
                  : result.pageContent
                }
              </p>
            </div>
          ))}
        </div>
      ) : query && !isSearching ? (
        <div className="text-center p-8 text-zinc-400">
          No documents found matching your search.
        </div>
      ) : null}
    </div>
  )
} 