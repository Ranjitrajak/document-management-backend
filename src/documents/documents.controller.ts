import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
    HttpStatus,
    HttpCode,
    Res,
    Query,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { Response } from 'express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import { DocumentsService } from './documents.service';
  import { CreateDocumentDto } from './dto/create-document.dto';
  import { UpdateDocumentDto } from './dto/update-document.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/roles.decorator';
  import { UserRole } from '../users/entities/user.entity';
  
  @Controller('documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}
  
    @Post('create')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (!file && !req.body?.description) {
            return cb(new BadRequestException('Either file or description must be provided'), false);
          }
          cb(null, true);
        },
      }),
    )
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    create(
      @Body() createDocumentDto: CreateDocumentDto,
      @UploadedFile() file: Express.Multer.File,
      @Request() req,
    ) {
      return this.documentsService.create(createDocumentDto, file, req.user);
    }

// If user is admin, they can view all documents or filter by userId

    @Get()
    @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
    findAll(@Query('userId') userId: string, @Request() req) {
      if (req.user.role === UserRole.ADMIN) {
        return this.documentsService.findAll(userId);
      } else {
        return this.documentsService.findAll(req.user.id);
      }
    }
  
    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
    findOne(@Param('id') id: number) {
      return this.documentsService.findOne(id);
    }
 
// Admin can update any document, editors can only update their own    

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    update(
      @Param('id') id: number,
      @Body() updateDocumentDto: UpdateDocumentDto,
      @Request() req,
    ) {
      const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
      return this.documentsService.update(id, updateDocumentDto, userId);
    }
 // Admin can delete any document, editors can only delete their own
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    remove(@Param('id') id: number, @Request() req) {
      const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
      return this.documentsService.remove(id, userId);
    }
  
    @Get(':id/download')
    @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
    async download(@Param('id') id: number, @Request() req, @Res() res: Response) {
      const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
      const { stream, document } = await this.documentsService.getFileStream(id, userId);
      
      res.set({
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
      });
      
      stream.pipe(res);
    }

 @Get(':id/download-txt')
@Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
async downloadAsText(
  @Param('id') id: number, 
  @Request() req, 
  @Res() res: Response
) {
  const userId = req.user.role === UserRole.ADMIN ? undefined : req.user.id;
  const { content, document } = await this.documentsService.getFileContent(id, userId, true);
  
  res.set({
    'Content-Type': 'text/plain',
    'Content-Disposition': `attachment; filename="${document.fileName}`,
  });
  
  res.send(content);
}
  }