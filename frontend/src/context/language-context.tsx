"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"

export type Language = "en" | "uk"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Header
    "header.title": "Valeriia Konovalchuk",

    // Recorder
    "recorder.placeholder": "Click On Start Transcription",
    "recorder.characterCount": "Character Count",
    "recorder.transcribe": "Transcribe",
    "recorder.transcribing": "Transcribing...",
    "recorder.uploadFile": "Upload file",
    "recorder.startRecording": "Start Recording",
    "recorder.stopRecording": "Stop Recording",
    "recorder.reset": "Reset",

    // Alerts and errors
    "alert.uploadFileFirst": "Please upload an audio file before transcription.",
    "alert.microphoneError": "Unable to access microphone. Check permissions.",
    "alert.unknownError": "An unknown error occurred",
    "alert.noDataToDownload": "No data to download",
    "alert.transcriptionFailed": "Transcription failed",

    // Download modal
    "download.title": "Select format for downloading",
    "download.txt": "Download as TXT",
    "download.json": "Download as JSON",
    "download.cancel": "Cancel",

    // Navigation
    "navigation.recorder": "Recorder",
    "navigation.history": "History",

    // Transcription
    "transcription.history": "Transcription History",
    "transcription.search": "Search",
    "transcription.allStatuses": "All Statuses",
    "transcription.completed": "Completed",
    "transcription.processing": "Processing",
    "transcription.pending": "Pending",
    "transcription.failed": "Failed",
    "transcription.noTranscriptions": "No transcriptions found",
    "transcription.confirmDelete": "Are you sure you want to delete this transcription?",
    "transcription.deleteTitle": "Confirmation of transcription deletion",
    "transcription.delete": "Delete",
    "transcription.deleteError": "Error deleting transcription",

    // Common
    "common.loading": "Loading...",
    "common.previous": "Previous",
    "common.next": "Next",
    "common.cancel": "Cancel",

    // Auth
    "auth.login": "Log in",
    "auth.register": "Register",
    "auth.logout": "Log out",
    "auth.pleaseLogin": "Please log in system",
    "auth.email": "Email",
    "auth.username": "Username",
    "auth.optional": "optional",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm password",
    "auth.noAccount": "No account?",
    "auth.haveAccount": "Already have an account?",

    //VerificationMessage
    "verificationMessage.title": "Confirm Email",
    "verificationMessage.message": "To use all the features of the application, you must confirm your email. We have sent an email with a confirmation link to:",
    "verificationMessage.hint": "Hint:",
    "verificationMessage.hintMessage": "Check your \"Spam\" or \"Promotions\" folder if you do not see the email in your inbox.",
    "verificationMessage.logout": "Log out",
    "verificationMessage.function": "After confirming your email, you will be able to use all the features of the application.",
    "verificationMessage.time": "The confirmation link is valid for 24 hours.",

    //VerificationSuccess
    "verificationSuccess.title": "Registration successful! ",
    "verificationSuccess.checkEmail": "Check your email!",
    "verificationSuccess.message": "We have sent an email with a confirmation link to the address you provided. After confirmation, you will be able to log in.",
    "verificationSuccess.resendEmail": "Resend",
    "verificationSuccess.emphasis": "Don't forget to check your \"Spam\" or \"Promotions\" folder.",
    "verificationSuccess.login": "Go to login",
  },
  uk: {
    // Header
    "header.title": "Валерія Коновальчук",

    // Recorder
    "recorder.placeholder": "Натисність для початку транскрибування",
    "recorder.characterCount": "Кількість символів",
    "recorder.transcribe": "Транскрибувати",
    "recorder.transcribing": "Транскрибування...",
    "recorder.uploadFile": "Завантажити файл",
    "recorder.startRecording": "Почати запис",
    "recorder.stopRecording": "Зупинити запис",
    "recorder.reset": "Скинути",

    // Alerts and errors
    "alert.uploadFileFirst": "Будь ласка, завантажте аудіофайл перед транскрибуванням.",
    "alert.microphoneError": "Не вдалося отримати доступ до мікрофону. Перевірте дозволи.",
    "alert.unknownError": "Сталася невідома помилка",
    "alert.noDataToDownload": "Немає даних для завантаження",
    "alert.transcriptionFailed": "Транскрибування не вдалася",

    // Download modal
    "download.title": "Виберіть формат для завантаження",
    "download.txt": "Завантажити як TXT",
    "download.json": "Завантажити як JSON",
    "download.cancel": "Скасувати",

    // Navigation
    "navigation.recorder": "Запис",
    "navigation.history": "Історія",

    // Transcription
    "transcription.history": "Історія транскрипцій",
    "transcription.search": "Пошук",
    "transcription.allStatuses": "Всі статуси",
    "transcription.completed": "Завершено",
    "transcription.processing": "Обробляється",
    "transcription.pending": "Очікує",
    "transcription.failed": "Помилка",
    "transcription.noTranscriptions": "Транскрипції не знайдено",
    "transcription.deleteTitle": "Підтвердження видалення транскрипції",
    "transcription.confirmDelete": "Ви впевнені, що хочете видалити цю транскрипцію?",
    "transcription.delete": "Видалити",
    "transcription.deleteError": "Помилка при видаленні транскрипції",

    // Common
    "common.loading": "Завантаження...",
    "common.previous": "Попередня",
    "common.next": "Наступна",
    "common.cancel": "Скасувати",

    // Auth
    "auth.login": "Авторизація",
    "auth.register": "Реєстрація",
    "auth.logout": "Вийти",
    "auth.pleaseLogin": "Будь ласка, увійдіть в систему",
    "auth.email": "Електронна пошта",
    "auth.username": "Ім'я користувача",
    "auth.optional": "необов'язково",
    "auth.password": "Пароль",
    "auth.confirmPassword": "Підтвердіть пароль",
    "auth.noAccount": "Немає акаунту?",
    "auth.haveAccount": "Вже є акаунт?",

    //VerificationMessage
    "verificationMessage.title": "Підтвердіть електронну пошту",
    "verificationMessage.message": "Для використання всіх функцій додатку необхідно підтвердити вашу електронну пошту. Ми відправили лист з посиланням для підтвердження на адресу:",
    "verificationMessage.hint": "Підказка:",
    "verificationMessage.hintMessage": "Перевірте папку \"Спам\" або \"Промоакції\", якщо не бачите лист у вхідних повідомленнях.",
    "verificationMessage.logout": "Вийти з акаунту",
    "verificationMessage.function": "Після підтвердження електронної пошти ви зможете користуватися всіма функціями додатку.",
    "verificationMessage.time": "Посилання для підтвердження дійсне протягом 24 годин.",

    //VerificationSuccess
    "verificationSuccess.title": "Реєстрація успішна!",
    "verificationSuccess.checkEmail": "Перевірте вашу пошту!",
    "verificationSuccess.message": "Ми відправили лист з посиланням для підтвердження на вказану адресу. Після підтвердження ви зможете увійти в систему.",
    "verificationSuccess.resendEmail": "Надіслати повторно",
    "verificationSuccess.emphasis": "Не забудьте перевірити папку \"Спам\" або \"Промоакції\".",
    "verificationSuccess.login": "Перейти до входу",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en")

  const t = (key: string): string => {
    const translationsForLanguage = translations[language] as Record<string, string>
    return translationsForLanguage[key] || key
  }

  const value = {
    language,
    setLanguage,
    t,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
