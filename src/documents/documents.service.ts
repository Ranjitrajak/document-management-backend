import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto, 
    file: Express.Multer.File,
    user: User
  ): Promise<DocumentResponseDto> {
    if (!file && !createDocumentDto.description) {
      throw new BadRequestException('Either file or description must be provided');
    }
    const document = this.documentsRepository.create({
      ...createDocumentDto,
      fileName: file?.originalname,
      fileType: file?.mimetype,
      filePath: file?.path,
      fileSize: file?.size,
      user,
      userId: user.id,
    });

    const savedDocument = await this.documentsRepository.save(document);
    return new DocumentResponseDto(savedDocument);
  }

  async findAll(userId?: string): Promise<DocumentResponseDto[]> {
    const query = this.documentsRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.user', 'user');
    
    if (userId) {
      query.where('document.userId = :userId', { userId });
    }
    
    const documents = await query.getMany();
    return documents.map(document => new DocumentResponseDto(document));
  }

  async findOne(id: number): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findOne({ 
      where: { id },
      relations: ['user'],
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    
    return new DocumentResponseDto(document);
  }

  async update(
    id: number, 
    updateDocumentDto: UpdateDocumentDto,
    userId: number
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findOne({ 
      where: { id, userId },
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or you don't have permission`);
    }
    Object.assign(document, updateDocumentDto);
    const updatedDocument = await this.documentsRepository.save(document);
    return new DocumentResponseDto(updatedDocument);
  }

  async remove(id: number, userId: number): Promise<void> {
    const document = await this.documentsRepository.findOne({ 
      where: { id, userId },
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or you don't have permission`);
    }
    await this.documentsRepository.remove(document);
  }

  async getFileStream(id: number, userId:number): Promise<{ 
    stream: fs.ReadStream, 
    document: Document 
  }> {
    const document = await this.documentsRepository.findOne({ 
      where: { id, userId },
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or you don't have permission`);
    }

    const filePath = document.filePath;
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }
    
    const stream = fs.createReadStream(filePath);
    return { stream, document };
  }

  async getFileContent(
    id:number, 
    userId: number,
    asText: boolean = false
  ): Promise<{ content: Buffer | string, document: Document }> {
    const document = await this.documentsRepository.findOne({ 
      where: { id, userId },
    });
  
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or you don't have permission`);
    }
  
    const filePath = document.filePath;
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }
  
    if (asText) {
      let textContent: string;
      
      if (document.fileType.includes('wordprocessingml')) { 
        const mammoth = require('mammoth');
        const { value } = await mammoth.extractRawText({ path: filePath });
        textContent = value;
      } else if (document.fileType.includes('pdf')) { 
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        textContent = data.text;
      } else if (document.fileType.includes('text/')) {
        textContent = fs.readFileSync(filePath, 'utf-8');
      } else {
        throw new BadRequestException('File type not supported for text conversion');
      }
      
      return { content: textContent, document };
    } else {
      return { content: fs.readFileSync(filePath), document };
    }
  }
  

  
}