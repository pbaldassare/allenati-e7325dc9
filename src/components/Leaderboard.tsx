import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export const Leaderboard = () => {
  const navigate = useNavigate();
  const leaderboardData = [
    { rank: 1, name: "Isabella Gomes", classes: 32, badge: "1st", color: "text-accent" },
    { rank: 2, name: "Hina Takahashi", classes: 31, badge: "2nd", color: "text-muted-foreground" },
    { rank: 3, name: "Stefano Saitta", classes: 30, badge: "3rd", color: "text-warning" },
    { rank: 4, name: "Jamal Richardson", classes: 30, badge: "4th", color: "" },
    { rank: 5, name: "Mei-Ling Zhou", classes: 29, badge: "5th", color: "" },
    { rank: 6, name: "Sofia Carvalho", classes: 28, badge: "6th", color: "" },
    { rank: 7, name: "Priya Deshmukh", classes: 28, badge: "7th", color: "" },
    { rank: 8, name: "Alexei Novikov", classes: 27, badge: "8th", color: "" },
  ];

  const timeFilters = ["Week", "Month", "Year", "All"];

  return (
    <div className="pb-20 px-4 space-y-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header con tasto indietro */}
        <div className="flex items-center gap-4 mb-6 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna indietro
          </Button>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Classifica</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Compete with Friends</p>
          </div>
        </div>

      {/* Time Filter */}
      <div className="flex justify-center gap-2">
        {timeFilters.map((filter, index) => (
          <Button
            key={filter}
            variant={index === 1 ? "default" : "outline"}
            size="sm"
            className={`h-11 sm:h-9 text-base sm:text-sm ${index === 1 ? "bg-primary text-primary-foreground" : ""}`}
          >
            {filter}
          </Button>
        ))}
      </div>

      {/* Top 3 Podium */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-end justify-center gap-6 sm:gap-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="w-18 sm:w-16 h-18 sm:h-16 border-4 border-muted">
                <AvatarFallback className="text-xl sm:text-lg font-bold">HT</AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <Badge variant="secondary" className="mb-1 text-sm">2nd</Badge>
                <p className="font-semibold text-base sm:text-sm">Hina Takahashi</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-4">
              <Avatar className="w-24 sm:w-20 h-24 sm:h-20 border-4 border-accent ring-4 ring-accent/20">
                <AvatarFallback className="text-2xl sm:text-xl font-bold">IG</AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <Badge className="bg-accent text-accent-foreground mb-1 text-sm">
                  <Trophy className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />
                  1st
                </Badge>
                <p className="font-semibold text-lg sm:text-base">Isabella Gomes</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="w-18 sm:w-16 h-18 sm:h-16 border-4 border-warning/50">
                <AvatarFallback className="text-xl sm:text-lg font-bold">SS</AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <Badge variant="outline" className="mb-1 border-warning text-warning text-sm">3rd</Badge>
                <p className="font-semibold text-base sm:text-sm">Stefano Saitta</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Leaderboard */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-lg">
            <Trophy className="h-6 w-6 sm:h-5 sm:w-5" />
            Classifica Completa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboardData.map((user) => (
            <div key={user.rank} className="flex items-center justify-between p-4 sm:p-3 border border-border rounded-lg hover:bg-muted/50 transition-smooth">
              <div className="flex items-center gap-4 sm:gap-3">
                <div className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-base sm:text-sm font-bold ${user.color}`}>
                  {user.rank <= 3 ? (
                    user.rank === 1 ? <Trophy className="h-5 w-5 sm:h-4 sm:w-4" /> :
                    user.rank === 2 ? <Medal className="h-5 w-5 sm:h-4 sm:w-4" /> :
                    <Award className="h-5 w-5 sm:h-4 sm:w-4" />
                  ) : (
                    user.rank
                  )}
                </div>
                <Avatar className="w-12 h-12 sm:w-10 sm:h-10">
                  <AvatarFallback className="text-base sm:text-sm font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base sm:text-sm">{user.name}</p>
                  <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">{user.badge}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl sm:text-lg">{user.classes}</p>
                <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">classi</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};