import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { VisitorLadderService } from "../visitor-ladder/visitor-ladder.service";

@Injectable()
export class VisitorLadderTask {
  private readonly logger = new Logger(VisitorLadderTask.name);

  constructor(private readonly ladder: VisitorLadderService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async evaluateVisitorLadder() {
    try {
      await this.ladder.evaluateDue(new Date());
    } catch (error) {
      this.logger.error("Visitor ladder evaluation failed", error);
    }
  }
}
