"use client"

import type React from "react"
import { useState, useEffect } from "react"
import styled from "styled-components"
import { FileAudio, Clock, Calendar, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"
import { useAuth } from "../../contexts/auth-context"
import { useLanguage } from "../../contexts/language-context"
import ConfirmationModal from "../ConfirmationModal"

// Типи даних
interface AudioData {
  id: string
  filename: string
  file_size: number
  duration: number
  format: string
  created_at: string
}

interface TranscriptionData {
  id: string
  text: string
  speakers_text: string
  speakers: any
  language: string
  status: "pending" | "processing" | "completed" | "failed"
  is_edited: boolean
  created_at: string
  updated_at: string
  audio: AudioData
}

interface PaginationData {
  page: number
  per_page: number
  total: number
  pages: number
  has_next: boolean
  has_prev: boolean
}

// Стилізовані компоненти в стилі Recorder
const Container = styled.div`
  width: 100%;
  min-height: 85vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem;
  background: ${(props) => props.theme.colors.background};
`

const HistoryCard = styled.div`
  width: 95%;
  max-width: 1200px;
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.text};
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`

const Title = styled.h1`
  color: ${(props) => props.theme.colors.text};
  font-size: 2rem;
  margin: 0;
  font-weight: 600;
`

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`

const SearchInput = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: ${(props) => props.theme.colors.text};
  min-width: 200px;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.accent};
    background: rgba(255, 255, 255, 0.15);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.accent};
    background: rgba(255, 255, 255, 0.15);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  option {
    background: ${(props) => props.theme.colors.primary};
    color: ${(props) => props.theme.colors.text};
  }
`

const TranscriptionGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
`

const TranscriptionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${(props) => props.theme.colors.accent};
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
`

const FileName = styled.h3`
  color: ${(props) => props.theme.colors.text};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  word-break: break-word;
  flex: 1;
`

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${(props) => {
    switch (props.status) {
      case "completed":
        return "#10b981"
      case "processing":
        return "#f59e0b"
      case "pending":
        return "#6b7280"
      case "failed":
        return "#ef4444"
      default:
        return "#6b7280"
    }
  }};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`

const CardContent = styled.div`
  margin-bottom: 1.5rem;
`

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text};
  opacity: 0.8;
`

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
`

const TextPreview = styled.p`
  color: ${(props) => props.theme.colors.text};
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.9rem;
  opacity: 0.9;
`

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.colors.accent};
    border-color: ${(props) => props.theme.colors.accent};
    color: white;
    transform: translateY(-1px);
  }
`

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
`

const PaginationButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${(props) => (props.disabled ? "rgba(255, 255, 255, 0.05)" : props.theme.colors.accent)};
  border: 2px solid ${(props) => (props.disabled ? "rgba(255, 255, 255, 0.1)" : props.theme.colors.accent)};
  border-radius: 0.5rem;
  color: ${(props) => (props.disabled ? "rgba(255, 255, 255, 0.4)" : "white")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.colors.accentDark};
    border-color: ${(props) => props.theme.colors.accentDark};
    transform: translateY(-1px);
  }
`

const PageInfo = styled.span`
  color: ${(props) => props.theme.colors.text};
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${(props) => props.theme.colors.text};
  font-size: 1.2rem;
  font-weight: 500;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #ff6b6b;
  font-size: 1.1rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 0.75rem;
  border: 2px solid rgba(255, 107, 107, 0.3);
`

const EmptyMessage = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${(props) => props.theme.colors.text};
  opacity: 0.6;
  font-size: 1.1rem;
`

const TranscriptionHistory: React.FC = () => {
  const { user, token } = useAuth()
  const { t } = useLanguage()

  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [transcriptionToDelete, setTranscriptionToDelete] = useState<TranscriptionData | null>(null)

  const fetchTranscriptions = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        throw new Error("No authentication token")
      }

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "10",
      })

      if (statusFilter) {
        params.append("status", statusFilter)
      }

      const response = await fetch(`http://localhost:5070/transcriptions/history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === "success") {
        setTranscriptions(data.transcriptions)
        setPagination(data.pagination)
      } else {
        throw new Error(data.message || "Failed to fetch transcriptions")
      }
    } catch (err) {
      console.error("Error fetching transcriptions:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTranscriptions(currentPage)
    }
  }, [user, currentPage, statusFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uk-UA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleViewTranscription = (transcription: TranscriptionData) => {
    console.log("View transcription:", transcription)
  }

  const handleEditTranscription = (transcription: TranscriptionData) => {
    console.log("Edit transcription:", transcription)
  }

  const handleDeleteClick = (transcription: TranscriptionData) => {
    setTranscriptionToDelete(transcription)
    setConfirmModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!transcriptionToDelete) return

    try {
      const response = await fetch(`http://localhost:5070/transcriptions/${transcriptionToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchTranscriptions(currentPage)
      } else {
        throw new Error("Failed to delete transcription")
      }
    } catch (err) {
      console.error("Error deleting transcription:", err)
      alert(t("transcription.deleteError"))
    } finally {
      setConfirmModalOpen(false)
      setTranscriptionToDelete(null)
    }
  }

  const cancelDelete = () => {
    setConfirmModalOpen(false)
    setTranscriptionToDelete(null)
  }

  const filteredTranscriptions = transcriptions.filter(
    (transcription) =>
      transcription.audio.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transcription.text && transcription.text.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (!user) {
    return (
      <Container>
        <HistoryCard>
          <LoadingMessage>{t("auth.pleaseLogin")}</LoadingMessage>
        </HistoryCard>
      </Container>
    )
  }

  return (
    <Container>
      <HistoryCard>
        <Header>
          <Title>{t("transcription.history")}</Title>
          <Controls>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}
              />
              <SearchInput
                type="text"
                placeholder={t("transcription.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "40px" }}
              />
            </div>
            <div style={{ position: "relative" }}>
              <Filter
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}
              />
              <FilterSelect value={statusFilter} onChange={handleStatusFilterChange} style={{ paddingLeft: "40px" }}>
                <option value="">{t("transcription.allStatuses")}</option>
                <option value="completed">{t("transcription.completed")}</option>
                <option value="processing">{t("transcription.processing")}</option>
                <option value="pending">{t("transcription.pending")}</option>
                <option value="failed">{t("transcription.failed")}</option>
              </FilterSelect>
            </div>
          </Controls>
        </Header>

        {loading && <LoadingMessage>{t("common.loading")}</LoadingMessage>}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {!loading && !error && filteredTranscriptions.length === 0 && (
          <EmptyMessage>{t("transcription.noTranscriptions")}</EmptyMessage>
        )}

        {!loading && !error && filteredTranscriptions.length > 0 && (
          <>
            <TranscriptionGrid>
              {filteredTranscriptions.map((transcription) => (
                <TranscriptionCard key={transcription.id}>
                  <CardHeader>
                    <FileName>{transcription.audio.filename}</FileName>
                    <StatusBadge status={transcription.status}>
                      {t(`transcription.${transcription.status}`)}
                    </StatusBadge>
                  </CardHeader>

                  <CardContent>
                    <MetaInfo>
                      <MetaItem>
                        <Calendar size={14} />
                        {formatDate(transcription.created_at)}
                      </MetaItem>
                      {transcription.audio.duration && (
                        <MetaItem>
                          <Clock size={14} />
                          {formatDuration(transcription.audio.duration)}
                        </MetaItem>
                      )}
                      <MetaItem>
                        <FileAudio size={14} />
                        {formatFileSize(transcription.audio.file_size)}
                      </MetaItem>
                    </MetaInfo>

                    {transcription.text && <TextPreview>{transcription.text}</TextPreview>}
                  </CardContent>

                  <CardActions>
                    <ActionButton onClick={() => handleViewTranscription(transcription)}>
                      <Eye size={16} />
                    </ActionButton>
                    <ActionButton onClick={() => handleEditTranscription(transcription)}>
                      <Edit size={16} />
                    </ActionButton>
                    <ActionButton onClick={() => handleDeleteClick(transcription)}>
                      <Trash2 size={16} />
                    </ActionButton>
                  </CardActions>
                </TranscriptionCard>
              ))}
            </TranscriptionGrid>

            {pagination && pagination.pages > 1 && (
              <Pagination>
                <PaginationButton disabled={!pagination.has_prev} onClick={() => handlePageChange(currentPage - 1)}>
                  <ChevronLeft size={16} />
                  {t("common.previous")}
                </PaginationButton>

                <PageInfo>{`${pagination.page} з ${pagination.pages}`}</PageInfo>

                <PaginationButton disabled={!pagination.has_next} onClick={() => handlePageChange(currentPage + 1)}>
                  {t("common.next")}
                  <ChevronRight size={16} />
                </PaginationButton>
              </Pagination>
            )}
          </>
        )}

        <ConfirmationModal
          isOpen={confirmModalOpen}
          title={t("transcription.deleteTitle")}
          message={t("transcription.confirmDelete")}
          confirmText={t("transcription.delete")}
          cancelText={t("common.cancel")}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDanger
        />
      </HistoryCard>
    </Container>
  )
}

export default TranscriptionHistory
