import { Exclude, Expose, Transform } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

@Exclude()
export class DocumentResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  fileName: string;

  @Expose()
  fileType: string;

  @Expose()
  fileSize: number;

  @Expose()
  @Transform(({ value }) => value.id)
  user: User;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<DocumentResponseDto>) {
    Object.assign(this, partial);
  }
}