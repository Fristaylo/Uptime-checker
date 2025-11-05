import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./DomainDropdown.module.scss";
import { domains } from "../../data/constants.ts";

const DomainDropdown: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [currentSelection, setCurrentSelection] = useState("Все домены");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentPath = location.pathname.slice(1);
        setCurrentSelection(
            currentPath
                ? domains.find((d) => d === currentPath) || currentPath
                : "Все домены"
        );
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (domain: string) => {
        if (currentSelection === domain) {
            setIsOpen(false);
            return;
        }
        setCurrentSelection(domain);
        setIsOpen(false);
        if (domain === "Все домены") {
            navigate("/");
        } else {
            navigate(`/${domain}`);
        }
    };

    return (
        <div className={styles.dropdownContainer} ref={dropdownRef}>
            <button
                className={styles.dropdownHeader}
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentSelection}
                <svg
                    width="16"
                    height="10"
                    viewBox="0 0 16 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${styles.arrow} ${
                        isOpen ? styles.arrowOpen : ""
                    }`}
                >
                    <path
                        d="M1.5 1.5L8 8.5L14.5 1.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            {isOpen && (
                <ul className={styles.dropdownList}>
                    <li
                        className={`${styles.dropdownItem} ${
                            currentSelection === "Все домены" ? styles.selected : ""
                        }`}
                        onClick={() => handleSelect("Все домены")}
                    >
                        Все домены
                    </li>
                    {domains.map((domain) => (
                        <li
                            key={domain}
                            className={`${styles.dropdownItem} ${
                                currentSelection === domain ? styles.selected : ""
                            }`}
                            onClick={() => handleSelect(domain)}
                        >
                            {domain}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DomainDropdown;