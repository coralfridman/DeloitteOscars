export type GameStatus = "lobby" | "voting" | "revealed" | "finished";

export type Poll = {
  id: string;
  title: string;
  created_at: string;
};

export type Question = {
  id: string;
  poll_id: string;
  prompt: string;
  background_image_url: string | null;
  position: number;
  time_limit_seconds: number;
};

export type Answer = {
  id: string;
  question_id: string;
  label: string;
  color: "red" | "blue" | "yellow" | "green";
  shape: "triangle" | "diamond" | "circle" | "square";
};

export type Game = {
  id: string;
  poll_id: string;
  code: string;
  host_token_hash: string;
  status: GameStatus;
  current_question_id: string | null;
  question_started_at: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  game_id: string;
  name: string;
  score: number;
  joined_at: string;
};

export type Submission = {
  id: string;
  game_id: string;
  player_id: string;
  question_id: string;
  answer_id: string;
  points_awarded: number;
  created_at: string;
};

export type QuestionWithAnswers = Question & { answers: Answer[] };

export const answerStyles = {
  red: "bg-kahootRed hover:bg-red-600",
  blue: "bg-kahootBlue hover:bg-blue-700",
  yellow: "bg-kahootYellow hover:bg-amber-600",
  green: "bg-kahootGreen hover:bg-green-700"
};

export const shapeIcon = {
  triangle: "▲",
  diamond: "◆",
  circle: "●",
  square: "■"
};
