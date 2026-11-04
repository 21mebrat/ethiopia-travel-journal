'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

export type MediaDoc = {
  id: string
  url: string
  filename: string
  alt?: string
  caption?: string
  width?: number
  height?: number
  mimeType?: string
  filesize?: number
  thumbnailURL?: string
}

type InlineMediaSelectorProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (media: MediaDoc | MediaDoc[]) => void
  multiSelect?: boolean
  initialTab?: 'choose' | 'upload'
}

export function InlineMediaSelector({
  isOpen,
  onClose,
  onSelect,
  multiSelect = true,
  initialTab = 'choose',
}: InlineMediaSelectorProps) {
  const [mediaItems, setMediaItems] = useState<MediaDoc[]>([])
  const [selectedDocsMap, setSelectedDocsMap] = useState<Map<string, MediaDoc>>(new Map())
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'choose' | 'upload'>(initialTab)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')

  const popoverRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch media library with pagination & search
  const fetchMedia = useCallback(
    async (query: string = '', pageNum: number = 1, append: boolean = false) => {
      setLoading(true)
      try {
        let endpoint = `/api/media?limit=60&page=${pageNum}&sort=-createdAt`
        if (query.trim()) {
          endpoint += `&where[filename][contains]=${encodeURIComponent(query.trim())}`
        }
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          const docs = data.docs || []
          if (append) {
            setMediaItems((prev) => {
              const existingIds = new Set(prev.map((d) => d.id))
              const newDocs = docs.filter((d: MediaDoc) => !existingIds.has(d.id))
              return [...prev, ...newDocs]
            })
          } else {
            setMediaItems(docs)
          }
          setHasMore(data.hasNextPage === true || docs.length === 60)
        }
      } catch (err) {
        console.error('Failed to fetch media:', err)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (isOpen) {
      setPage(1)
      setSearchQuery('')
      fetchMedia('', 1, false)
      setSelectedDocsMap(new Map())
      setActiveTab(initialTab)
      setSelectedFile(null)
      setAltText('')
      setUploadError(null)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, initialTab, fetchMedia])

  // Search debounce
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      setPage(1)
      fetchMedia(searchQuery, 1, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, isOpen, fetchMedia])

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // File Upload Handler (+ Create New Media)
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    setAltText(cleanName)
    setUploadError(null)
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please select an image file to upload')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('alt', altText.trim() || selectedFile.name)

      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.errors?.[0]?.message || 'Failed to upload image')
      }

      const created = await res.json()
      const newDoc: MediaDoc = created.doc || created

      // Automatically insert newly created media
      onSelect(newDoc)
      onClose()
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleItemSelection = (item: MediaDoc) => {
    if (!multiSelect) {
      onSelect(item)
      onClose()
      return
    }

    setSelectedDocsMap((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, item)
      }
      return next
    })
  }

  const handleConfirmMultiSelect = () => {
    const selectedDocs = Array.from(selectedDocsMap.values())
    if (selectedDocs.length > 0) {
      onSelect(selectedDocs.length === 1 ? selectedDocs[0] : selectedDocs)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Media Selector"
        data-testid="vml-media-selector"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          background: 'var(--card)',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit',
          color: 'var(--card-foreground)',
          animation: 'media-selector-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Header Tabs: Choose Media vs Add New Media */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('choose')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: 'none',
                background: activeTab === 'choose' ? 'var(--card)' : 'transparent',
                color: activeTab === 'choose' ? 'var(--chart-1, #d97706)' : 'var(--muted-foreground)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'choose' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🖼️ Choose Existing Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: 'none',
                background: activeTab === 'upload' ? 'var(--card)' : 'transparent',
                color: activeTab === 'upload' ? 'var(--chart-1, #d97706)' : 'var(--muted-foreground)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'upload' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              + Add / Upload New Media
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'var(--muted-foreground)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm, 6px)',
              lineHeight: 1,
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Tab 1: Choose Media (Searchable library) */}
        {activeTab === 'choose' && (
          <>
            {/* Search Bar */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--card)',
              }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)',
                    fontSize: '13px',
                  }}
                >
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search media library by filename..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: '13px',
                    border: '1px solid var(--input, var(--border))',
                    borderRadius: 'var(--radius-md, 8px)',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {selectedDocsMap.size > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmMultiSelect}
                  data-testid="vml-insert-selected"
                  style={{
                    padding: '8px 16px',
                    background: 'var(--chart-1, #d97706)',
                    color: 'var(--primary-foreground, #ffffff)',
                    border: 'none',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  Insert ({selectedDocsMap.size}) Selected
                </button>
              )}
            </div>

            {/* Media Grid */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 18px',
                maxHeight: '400px',
              }}
            >
              {loading && mediaItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                  Loading media library...
                </div>
              ) : mediaItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                  {searchQuery ? 'No matching images found' : 'No images in media library yet'}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {mediaItems.map((item) => {
                      const imgUrl = item.thumbnailURL || item.url
                      const isChecked = selectedDocsMap.has(item.id)

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item)}
                        data-testid="vml-media-card"
                        data-media-id={item.id}
                        style={{
                          background: isChecked ? 'var(--accent)' : 'var(--card)',
                          border: isChecked ? '2px solid var(--chart-1, #d97706)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-lg, 10px)',
                          padding: '5px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                          position: 'relative',
                          textAlign: 'center',
                        }}
                      >
                        {/* Checkbox badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '18px',
                            height: '18px',
                            borderRadius: 'var(--radius-sm, 4px)',
                            background: isChecked ? 'var(--chart-1, #d97706)' : 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-foreground, #ffffff)',
                            fontSize: '11px',
                            fontWeight: 800,
                            zIndex: 10,
                          }}
                        >
                          {isChecked ? '✓' : ''}
                        </div>

                        <div
                          style={{
                            width: '100%',
                            height: '80px',
                            borderRadius: 'var(--radius-sm, 6px)',
                            overflow: 'hidden',
                            background: 'var(--muted)',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgUrl}
                              alt={item.alt || item.filename}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '20px' }}>🖼️</span>
                          )}
                        </div>
                        <span
                          style={{
                            marginTop: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.filename}
                        >
                          {item.filename}
                        </span>
                        {item.width && item.height && (
                          <span style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>
                            {item.width}×{item.height}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '16px 0 8px 0' }}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchMedia(searchQuery, nextPage, true)
                      }}
                      style={{
                        padding: '7px 18px',
                        background: 'var(--secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md, 8px)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        color: 'var(--secondary-foreground)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {loading ? 'Loading more photos...' : 'Load More Photos'}
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </>
        )}

        {/* Tab 2: Add New Media (Fast in-place upload) */}
        {activeTab === 'upload' && (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleFileSelect(f)
                }}
                style={{
                  border: '2px dashed var(--chart-1, #d97706)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--accent)',
                }}
              >
                <span style={{ fontSize: '36px' }}>☁️</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>
                  Click to browse or drag & drop an image here
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                  PNG, JPG, WebP, AVIF up to 20MB
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--muted)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📁 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--chart-1, #d97706)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      marginBottom: '4px',
                    }}
                  >
                    Alt Text / Description (SEO)
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="e.g. Traditional Ethiopian coffee pot on coals"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {uploadError && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--destructive-foreground, #ffffff)',
                      background: 'var(--destructive)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                    }}
                  >
                    ⚠️ {uploadError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('choose')}
                    disabled={isUploading}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md, 8px)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--secondary-foreground)',
                      cursor: 'pointer',
                    }}
                  >
                    Back to Library
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadSubmit}
                    disabled={isUploading}
                    style={{
                      padding: '8px 20px',
                      background: 'var(--chart-1, var(--primary))',
                      border: 'none',
                      borderRadius: 'var(--radius-md, 8px)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--primary-foreground, #ffffff)',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isUploading ? 'Uploading & Inserting...' : 'Upload & Insert'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--muted)',
            fontSize: '12px',
            color: 'var(--muted-foreground)',
          }}
        >
          <span>
            {activeTab === 'choose'
              ? selectedDocsMap.size > 0
                ? `${selectedDocsMap.size} images selected. Click 'Insert Selected' above.`
                : 'Click any image to select. Multi-select enabled.'
              : 'Add new photo directly to media collection.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--card-foreground)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
