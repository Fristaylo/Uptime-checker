import styles from "./StaleDataWarning.module.scss";
import cn from "classnames";

interface StaleDataWarningProps {
    isError: boolean;
}

const StaleDataWarning = ({ isError }: StaleDataWarningProps) => {
    return (
        <div
            className={cn(styles.staleDataWarning, {
                [styles.staleDataWarningError]: isError,
            })}
        >
            {isError
                ? "Не удалось обновить данные"
                : "Данные могут быть устаревшими. Обновление..."}
        </div>
    );
};

export default StaleDataWarning;