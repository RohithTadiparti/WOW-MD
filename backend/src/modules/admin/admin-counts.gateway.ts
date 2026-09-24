import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { Permission, roleHasPermission } from '../../common/authz/permissions';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../../common/enums';
import { AdminPendingCounts, AdminPendingCountsService } from './admin-pending-counts.service';

@WebSocketGateway({ namespace: 'admin', cors: true })
export class AdminCountsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(AdminCountsGateway.name);
  private readonly snapshots = new Map<string, string>();
  private timer?: NodeJS.Timeout;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly counts: AdminPendingCountsService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  afterInit() {
    this.timer = setInterval(() => void this.publishChanged(), 5000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.auth.jwtSecret });
      const user = await this.users.findOne({
        where: { id: payload.sub },
        select: ['id', 'role', 'isActive'],
      });
      if (!user || !user.isActive || user.role !== UserRole.ADMIN || !roleHasPermission(user.role, Permission.ADMIN_ANALYTICS_READ)) {
        throw new Error('forbidden');
      }
      client.data.userId = user.id;
      client.join(`admin:${user.id}`);
      await this.publishFor(user.id);
    } catch {
      this.logger.warn('Rejected admin counts socket connection');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  private async publishChanged() {
    const admins = await this.users.find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: ['id'],
    });
    await Promise.all(admins.map((admin) => this.publishFor(admin.id)));
  }

  private async publishFor(adminUserId: string) {
    const next = await this.counts.getCounts(adminUserId);
    const serialized = JSON.stringify(next);
    if (this.snapshots.get(adminUserId) === serialized) return;
    this.snapshots.set(adminUserId, serialized);
    this.server.to(`admin:${adminUserId}`).emit('counts:changed', next satisfies AdminPendingCounts);
  }
}
