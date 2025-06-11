"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Globe, ChevronDown } from "lucide-react"
import { useLanguage, type Language } from "../../contexts/language-context"
import {
  LanguageSelectorContainer,
  LanguageButton,
  LanguageIcon,
  DropdownIcon,
  DropdownMenu,
  DropdownItem,
  FlagIcon,
} from "./styles"

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const languages = [
    { code: "en" as Language, flag: "EN" },
    { code: "uk" as Language, flag: "UA" },
  ]

  const currentLanguage = languages.find((lang) => lang.code === language)

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <LanguageSelectorContainer ref={containerRef}>
      <LanguageButton onClick={toggleDropdown} isOpen={isOpen}>
        <LanguageIcon>
          <Globe size={16} />
        </LanguageIcon>
        <FlagIcon>{currentLanguage?.flag}</FlagIcon>
        <DropdownIcon isOpen={isOpen}>
          <ChevronDown size={14} />
        </DropdownIcon>
      </LanguageButton>

      {isOpen && (
        <DropdownMenu>
          {languages.map((lang) => (
            <DropdownItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              isSelected={lang.code === language}
            >
              <FlagIcon>{lang.flag}</FlagIcon>
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </LanguageSelectorContainer>
  )
}

export default LanguageSelector
