import { ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FeedbackType = 'too_easy' | 'pain' | 'ok';

interface ExerciseFeedbackButtonsProps {
  onFeedback: (type: FeedbackType) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const ExerciseFeedbackButtons = ({ onFeedback, isLoading, disabled }: ExerciseFeedbackButtonsProps) => {
  return (
    <div className="flex gap-2 justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('too_easy')}
        disabled={disabled || isLoading}
        className="flex-1 max-w-[100px] border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 text-green-600 dark:text-green-400"
      >
        <ThumbsUp className="h-4 w-4 mr-1" />
        Facile
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('ok')}
        disabled={disabled || isLoading}
        className="flex-1 max-w-[100px] border-primary/30 hover:bg-primary/10 hover:border-primary/50"
      >
        OK
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('pain')}
        disabled={disabled || isLoading}
        className="flex-1 max-w-[100px] border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 text-destructive"
      >
        <AlertTriangle className="h-4 w-4 mr-1" />
        Douleur
      </Button>
    </div>
  );
};

export default ExerciseFeedbackButtons;
