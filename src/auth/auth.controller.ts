import { 
    Controller, 
    Post, 
    Body, 
    HttpCode, 
    HttpStatus, 
    UseGuards,
    UnauthorizedException
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
  import { RegisterDto } from './dto/register.dto';
  import { LoginDto } from './dto/login.dto';
  import { LocalAuthGuard } from './guards/local-auth.guard';
  import { JwtAuthGuard } from './guards/jwt-auth.guard';
  
  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}
  
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
      const user = await this.authService.register(registerDto);
      return { message: 'User registered successfully', user };
    }
  
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
      const result = await this.authService.login(loginDto);
      
      if (!result) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      return result;
    }
 // JWT is stateless, so we don't actually need to do anything here  
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout() {
      return { message: 'Logged out successfully' };
    }
  }